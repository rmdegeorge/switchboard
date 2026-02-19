import type {
  InterceptRule,
  PausedRequest,
  PausedRequestResolution,
  RequestStage,
} from "@shared/types";
import { broadcastToUI } from "@shared/messages";
import { toBase64, fromBase64 } from "@shared/encoding";
import { urlPatternToRegex } from "@shared/urlPattern";
import { getState, addPausedRequest, removePausedRequest } from "./state";

interface FetchRequestPausedEvent {
  requestId: string;
  request: {
    url: string;
    method: string;
    headers: Record<string, string>;
    postData?: string;
  };
  resourceType: string;
  responseStatusCode?: number;
  responseHeaders?: Array<{ name: string; value: string }>;
  responseErrorReason?: string;
}

function headersRecordToArray(
  headers: Record<string, string>,
): Array<{ name: string; value: string }> {
  return Object.entries(headers).map(([name, value]) => ({ name, value }));
}

function matchesRule(
  event: FetchRequestPausedEvent,
  stage: RequestStage,
  rule: InterceptRule,
): boolean {
  if (!rule.enabled) return false;
  if (rule.requestStage !== stage) return false;

  const regex = urlPatternToRegex(rule.urlPattern);
  if (!regex.test(event.request.url)) return false;

  if (rule.resourceTypes.length > 0 && !rule.resourceTypes.some((t) => t === event.resourceType)) {
    return false;
  }

  if (rule.httpMethods?.length > 0 && !rule.httpMethods.some((m) => m === event.request.method)) {
    return false;
  }

  return true;
}

function findMatchingRule(
  event: FetchRequestPausedEvent,
  stage: RequestStage,
): InterceptRule | null {
  const { rules, enabled } = getState();
  if (!enabled) return null;

  for (const rule of rules) {
    if (matchesRule(event, stage, rule)) {
      return rule;
    }
  }
  return null;
}

async function getResponseBody(tabId: number, requestId: string): Promise<string | undefined> {
  try {
    const result = (await chrome.debugger.sendCommand({ tabId }, "Fetch.getResponseBody", {
      requestId,
    })) as { body: string; base64Encoded: boolean };

    if (result.base64Encoded) {
      return fromBase64(result.body);
    }
    return result.body;
  } catch (err) {
    console.warn("getResponseBody failed:", err);
    return undefined;
  }
}

async function handlePause(
  tabId: number,
  event: FetchRequestPausedEvent,
  rule: InterceptRule,
  stage: RequestStage,
): Promise<void> {
  let responseBody: string | undefined;
  if (stage === "Response") {
    responseBody = await getResponseBody(tabId, event.requestId);
  }

  const paused: PausedRequest = {
    requestId: event.requestId,
    tabId,
    ruleId: rule.id,
    url: event.request.url,
    method: event.request.method,
    headers: headersRecordToArray(event.request.headers),
    postData: event.request.postData,
    resourceType: event.resourceType,
    stage,
    responseStatusCode: event.responseStatusCode,
    responseHeaders: event.responseHeaders,
    responseBody,
    timestamp: Date.now(),
  };

  addPausedRequest(paused);
  broadcastToUI({ type: "REQUEST_PAUSED", request: paused });
  broadcastToUI({ type: "STATE_UPDATED", state: getState() });
}

async function handleModifyRequest(
  tabId: number,
  event: FetchRequestPausedEvent,
  rule: InterceptRule,
): Promise<void> {
  if (rule.action.type !== "modify-request") return;

  const mods = rule.action.modifications;
  await chrome.debugger.sendCommand({ tabId }, "Fetch.continueRequest", {
    requestId: event.requestId,
    url: mods.url,
    method: mods.method,
    headers: mods.headers
      ? Object.entries(mods.headers).map(([name, value]) => ({ name, value }))
      : undefined,
    postData: mods.postData ? toBase64(mods.postData) : undefined,
  });
}

async function handleMockResponse(
  tabId: number,
  event: FetchRequestPausedEvent,
  rule: InterceptRule,
): Promise<void> {
  if (rule.action.type !== "mock-response") return;

  const mock = rule.action.response;
  await chrome.debugger.sendCommand({ tabId }, "Fetch.fulfillRequest", {
    requestId: event.requestId,
    responseCode: mock.responseCode,
    responseHeaders: mock.responseHeaders,
    body: mock.body ? toBase64(mock.body) : undefined,
  });
}

async function handleProxy(
  tabId: number,
  event: FetchRequestPausedEvent,
  rule: InterceptRule,
): Promise<void> {
  if (rule.action.type !== "proxy") return;

  await chrome.debugger.sendCommand({ tabId }, "Fetch.continueRequest", {
    requestId: event.requestId,
    url: rule.action.targetUrl,
  });
}

async function continueRequest(tabId: number, requestId: string): Promise<void> {
  await chrome.debugger.sendCommand({ tabId }, "Fetch.continueRequest", { requestId });
}

export async function handleRequestPaused(
  tabId: number,
  event: FetchRequestPausedEvent,
): Promise<void> {
  const stage: RequestStage = event.responseStatusCode != null ? "Response" : "Request";
  const rule = findMatchingRule(event, stage);

  if (!rule) {
    if (stage === "Response") {
      await chrome.debugger.sendCommand({ tabId }, "Fetch.continueResponse", {
        requestId: event.requestId,
      });
    } else {
      await continueRequest(tabId, event.requestId);
    }
    return;
  }

  switch (rule.action.type) {
    case "pause":
      await handlePause(tabId, event, rule, stage);
      break;
    case "modify-request":
      await handleModifyRequest(tabId, event, rule);
      break;
    case "mock-response":
      await handleMockResponse(tabId, event, rule);
      break;
    case "proxy":
      await handleProxy(tabId, event, rule);
      break;
  }
}

export async function resolveRequest(
  requestId: string,
  tabId: number,
  resolution: PausedRequestResolution,
): Promise<void> {
  try {
    switch (resolution.type) {
      case "continue": {
        const mods = resolution.modifications;
        await chrome.debugger.sendCommand({ tabId }, "Fetch.continueRequest", {
          requestId,
          url: mods?.url,
          method: mods?.method,
          headers: mods?.headers,
          postData: mods?.postData ? toBase64(mods.postData) : undefined,
        });
        break;
      }
      case "continue-response": {
        const mods = resolution.modifications;
        if (mods?.body || mods?.responseCode || mods?.responseHeaders) {
          await chrome.debugger.sendCommand({ tabId }, "Fetch.fulfillRequest", {
            requestId,
            responseCode: mods.responseCode ?? 200,
            responseHeaders: mods.responseHeaders,
            body: mods.body ? toBase64(mods.body) : undefined,
          });
        } else {
          await chrome.debugger.sendCommand({ tabId }, "Fetch.continueResponse", { requestId });
        }
        break;
      }
      case "fulfill":
        await chrome.debugger.sendCommand({ tabId }, "Fetch.fulfillRequest", {
          requestId,
          responseCode: resolution.responseCode,
          responseHeaders: resolution.responseHeaders,
          body: resolution.body ? toBase64(resolution.body) : undefined,
        });
        break;
      case "fail":
        await chrome.debugger.sendCommand({ tabId }, "Fetch.failRequest", {
          requestId,
          errorReason: resolution.reason ?? "Failed",
        });
        break;
    }
  } finally {
    removePausedRequest(requestId);
    broadcastToUI({ type: "REQUEST_RESOLVED", requestId });
    broadcastToUI({ type: "STATE_UPDATED", state: getState() });
  }
}

export function setupFetchInterceptor(): void {
  chrome.debugger.onEvent.addListener((source, method, params) => {
    if (method === "Fetch.requestPaused" && source.tabId != null) {
      handleRequestPaused(source.tabId, params as FetchRequestPausedEvent).catch((err) => {
        console.error("handleRequestPaused failed:", err);
        // Attempt to continue the request so the tab doesn't hang
        if (source.tabId != null) {
          const event = params as FetchRequestPausedEvent;
          const command =
            event.responseStatusCode != null ? "Fetch.continueResponse" : "Fetch.continueRequest";
          chrome.debugger
            .sendCommand({ tabId: source.tabId }, command, {
              requestId: event.requestId,
            })
            .catch((fallbackErr) => {
              console.warn("setupFetchInterceptor: fallback also failed:", fallbackErr);
            });
        }
      });
    }
  });
}
