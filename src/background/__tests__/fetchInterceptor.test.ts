/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { InterceptRule } from "@shared/types";
import type { FetchRequestPausedEvent } from "../fetchInterceptor";

// ---------------------------------------------------------------------------
// Chrome stub — must be in place before any module import that touches chrome.*
// ---------------------------------------------------------------------------
const sendCommand = vi.fn(() => Promise.resolve({}));
const runtimeSendMessage = vi.fn(() => Promise.resolve());

vi.stubGlobal("chrome", {
  debugger: { sendCommand },
  runtime: { sendMessage: runtimeSendMessage },
  storage: {
    local: {
      get: vi.fn(() => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve()),
    },
  },
});

// Mock the state module so we can control getState / spy on add/removePausedRequest
vi.mock("../state", async () => {
  const actual = await vi.importActual("../state");
  return {
    ...actual,
    ready: Promise.resolve(), // no-op — don't wait for storage
  };
});

// Dynamic import after mocks are wired up
const { matchesRule, headersRecordToArray, findMatchingRule, handleRequestPaused, resolveRequest } =
  await import("../fetchInterceptor");

const { getState, setState, addPausedRequest } = await import("../state");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeEvent(overrides: Partial<FetchRequestPausedEvent> = {}): FetchRequestPausedEvent {
  return {
    requestId: "req-1",
    request: {
      url: "https://api.example.com/users",
      method: "GET",
      headers: { Accept: "application/json" },
    },
    resourceType: "XHR",
    ...overrides,
  };
}

function makeRule(overrides: Partial<InterceptRule> = {}): InterceptRule {
  return {
    id: "rule-1",
    enabled: true,
    urlPattern: "*api.example.com*",
    label: "Test rule",
    requestStage: "Request",
    resourceTypes: [],
    httpMethods: [],
    action: { type: "pause" },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  setState({
    enabled: true,
    rules: [],
    attachedTabs: [],
    pausedRequests: [],
  });
});

// ===========================================================================
// matchesRule — pure, zero mocks
// ===========================================================================
describe("matchesRule", () => {
  it("matches when URL, stage, and enabled all align", () => {
    expect(matchesRule(makeEvent(), "Request", makeRule())).toBe(true);
  });

  it("returns false when rule is disabled", () => {
    expect(matchesRule(makeEvent(), "Request", makeRule({ enabled: false }))).toBe(false);
  });

  it("returns false when stage doesn't match", () => {
    expect(matchesRule(makeEvent(), "Response", makeRule({ requestStage: "Request" }))).toBe(false);
  });

  it("returns false when URL doesn't match pattern", () => {
    expect(
      matchesRule(makeEvent(), "Request", makeRule({ urlPattern: "*other-domain.com*" })),
    ).toBe(false);
  });

  it("empty resourceTypes matches all resource types", () => {
    expect(matchesRule(makeEvent(), "Request", makeRule({ resourceTypes: [] }))).toBe(true);
  });

  it("non-matching resourceTypes returns false", () => {
    expect(matchesRule(makeEvent(), "Request", makeRule({ resourceTypes: ["Document"] }))).toBe(
      false,
    );
  });

  it("matching resourceTypes returns true", () => {
    expect(matchesRule(makeEvent(), "Request", makeRule({ resourceTypes: ["XHR"] }))).toBe(true);
  });

  it("empty httpMethods matches all methods", () => {
    expect(matchesRule(makeEvent(), "Request", makeRule({ httpMethods: [] }))).toBe(true);
  });

  it("non-matching httpMethods returns false", () => {
    expect(matchesRule(makeEvent(), "Request", makeRule({ httpMethods: ["POST"] }))).toBe(false);
  });

  it("matching httpMethods returns true", () => {
    expect(matchesRule(makeEvent(), "Request", makeRule({ httpMethods: ["GET"] }))).toBe(true);
  });
});

// ===========================================================================
// headersRecordToArray — pure, zero mocks
// ===========================================================================
describe("headersRecordToArray", () => {
  it("converts Record to name/value array", () => {
    expect(headersRecordToArray({ "Content-Type": "text/html", Accept: "*/*" })).toEqual([
      { name: "Content-Type", value: "text/html" },
      { name: "Accept", value: "*/*" },
    ]);
  });

  it("returns empty array for empty object", () => {
    expect(headersRecordToArray({})).toEqual([]);
  });
});

// ===========================================================================
// findMatchingRule — state mock only
// ===========================================================================
describe("findMatchingRule", () => {
  it("returns null when extension is disabled", () => {
    setState({ enabled: false, rules: [makeRule()] });
    expect(findMatchingRule(makeEvent(), "Request")).toBeNull();
  });

  it("returns null when no rules match", () => {
    setState({ enabled: true, rules: [makeRule({ urlPattern: "*other.com*" })] });
    expect(findMatchingRule(makeEvent(), "Request")).toBeNull();
  });

  it("returns first matching rule when multiple match", () => {
    setState({
      enabled: true,
      rules: [
        makeRule({ id: "r1", urlPattern: "*api.example.com*" }),
        makeRule({ id: "r2", urlPattern: "*example.com*" }),
      ],
    });
    expect(findMatchingRule(makeEvent(), "Request")?.id).toBe("r1");
  });

  it("skips disabled rules, returns next matching one", () => {
    setState({
      enabled: true,
      rules: [makeRule({ id: "r1", enabled: false }), makeRule({ id: "r2", enabled: true })],
    });
    expect(findMatchingRule(makeEvent(), "Request")?.id).toBe("r2");
  });
});

// ===========================================================================
// handleRequestPaused — chrome.debugger + state mocks
// ===========================================================================
describe("handleRequestPaused", () => {
  const tabId = 42;

  it("no matching rule + request stage → Fetch.continueRequest", async () => {
    setState({ enabled: true, rules: [] });
    await handleRequestPaused(tabId, makeEvent());

    expect(sendCommand).toHaveBeenCalledWith({ tabId }, "Fetch.continueRequest", {
      requestId: "req-1",
    });
  });

  it("no matching rule + response stage → Fetch.continueResponse", async () => {
    setState({ enabled: true, rules: [] });
    await handleRequestPaused(tabId, makeEvent({ responseStatusCode: 200 }));

    expect(sendCommand).toHaveBeenCalledWith({ tabId }, "Fetch.continueResponse", {
      requestId: "req-1",
    });
  });

  it("modify-request action → Fetch.continueRequest with modifications", async () => {
    setState({
      enabled: true,
      rules: [
        makeRule({
          action: {
            type: "modify-request",
            modifications: {
              url: "https://api.example.com/v2/users",
              headers: { "X-Custom": "value" },
              postData: '{"key":"val"}',
            },
          },
        }),
      ],
    });

    await handleRequestPaused(tabId, makeEvent());

    expect(sendCommand).toHaveBeenCalledWith({ tabId }, "Fetch.continueRequest", {
      requestId: "req-1",
      url: "https://api.example.com/v2/users",
      method: undefined,
      headers: [{ name: "X-Custom", value: "value" }],
      postData: expect.any(String), // base64 encoded
    });
  });

  it("mock-response action → Fetch.fulfillRequest with responseCode and body", async () => {
    setState({
      enabled: true,
      rules: [
        makeRule({
          action: {
            type: "mock-response",
            response: {
              responseCode: 404,
              body: '{"error":"not found"}',
            },
          },
        }),
      ],
    });

    await handleRequestPaused(tabId, makeEvent());

    expect(sendCommand).toHaveBeenCalledWith({ tabId }, "Fetch.fulfillRequest", {
      requestId: "req-1",
      responseCode: 404,
      responseHeaders: undefined,
      body: expect.any(String), // base64
    });
  });

  it("proxy action → Fetch.continueRequest with targetUrl", async () => {
    setState({
      enabled: true,
      rules: [
        makeRule({
          action: { type: "proxy", targetUrl: "https://staging.example.com/users" },
        }),
      ],
    });

    await handleRequestPaused(tabId, makeEvent());

    expect(sendCommand).toHaveBeenCalledWith({ tabId }, "Fetch.continueRequest", {
      requestId: "req-1",
      url: "https://staging.example.com/users",
    });
  });

  it("pause action → addPausedRequest called + broadcastToUI called", async () => {
    setState({
      enabled: true,
      rules: [makeRule({ action: { type: "pause" } })],
    });

    await handleRequestPaused(tabId, makeEvent());

    // The paused request was added to state
    expect(getState().pausedRequests).toHaveLength(1);
    expect(getState().pausedRequests[0].requestId).toBe("req-1");

    // broadcastToUI was called (sends via chrome.runtime.sendMessage)
    expect(runtimeSendMessage).toHaveBeenCalled();
  });

  it("correctly detects Response stage from responseStatusCode", async () => {
    setState({
      enabled: true,
      rules: [makeRule({ requestStage: "Response", action: { type: "pause" } })],
    });

    // Provide a response body result for getResponseBody
    sendCommand.mockResolvedValueOnce({ body: "cmVzcG9uc2U=", base64Encoded: true });

    await handleRequestPaused(
      tabId,
      makeEvent({ responseStatusCode: 200, responseHeaders: [{ name: "x-test", value: "1" }] }),
    );

    expect(getState().pausedRequests[0].stage).toBe("Response");
  });
});

// ===========================================================================
// resolveRequest — chrome.debugger + state mocks
// ===========================================================================
describe("resolveRequest", () => {
  const tabId = 42;
  const requestId = "req-1";

  beforeEach(() => {
    // Seed a paused request so removePausedRequest has something to remove
    addPausedRequest({
      requestId,
      tabId,
      ruleId: "rule-1",
      url: "https://api.example.com/users",
      method: "GET",
      headers: [],
      resourceType: "XHR",
      stage: "Request",
      timestamp: Date.now(),
    });
  });

  it("continue with modifications → Fetch.continueRequest with args", async () => {
    await resolveRequest(requestId, tabId, {
      type: "continue",
      modifications: {
        url: "https://api.example.com/v2",
        method: "POST",
        headers: [{ name: "X-Foo", value: "bar" }],
        postData: '{"a":1}',
      },
    });

    expect(sendCommand).toHaveBeenCalledWith({ tabId }, "Fetch.continueRequest", {
      requestId,
      url: "https://api.example.com/v2",
      method: "POST",
      headers: [{ name: "X-Foo", value: "bar" }],
      postData: expect.any(String), // base64
    });
  });

  it("continue without modifications → Fetch.continueRequest with just requestId", async () => {
    await resolveRequest(requestId, tabId, { type: "continue" });

    expect(sendCommand).toHaveBeenCalledWith({ tabId }, "Fetch.continueRequest", {
      requestId,
      url: undefined,
      method: undefined,
      headers: undefined,
      postData: undefined,
    });
  });

  it("continue-response with body/status → Fetch.fulfillRequest", async () => {
    await resolveRequest(requestId, tabId, {
      type: "continue-response",
      modifications: { responseCode: 201, body: '{"created":true}' },
    });

    expect(sendCommand).toHaveBeenCalledWith({ tabId }, "Fetch.fulfillRequest", {
      requestId,
      responseCode: 201,
      responseHeaders: undefined,
      body: expect.any(String),
    });
  });

  it("continue-response without modifications → Fetch.continueResponse", async () => {
    await resolveRequest(requestId, tabId, { type: "continue-response" });

    expect(sendCommand).toHaveBeenCalledWith({ tabId }, "Fetch.continueResponse", { requestId });
  });

  it("fulfill → Fetch.fulfillRequest with responseCode, headers, base64 body", async () => {
    await resolveRequest(requestId, tabId, {
      type: "fulfill",
      responseCode: 200,
      responseHeaders: [{ name: "Content-Type", value: "application/json" }],
      body: '{"ok":true}',
    });

    expect(sendCommand).toHaveBeenCalledWith({ tabId }, "Fetch.fulfillRequest", {
      requestId,
      responseCode: 200,
      responseHeaders: [{ name: "Content-Type", value: "application/json" }],
      body: expect.any(String),
    });
  });

  it("fail with reason → Fetch.failRequest with that reason", async () => {
    await resolveRequest(requestId, tabId, { type: "fail", reason: "ConnectionRefused" });

    expect(sendCommand).toHaveBeenCalledWith({ tabId }, "Fetch.failRequest", {
      requestId,
      errorReason: "ConnectionRefused",
    });
  });

  it("fail without reason → defaults to 'Failed'", async () => {
    await resolveRequest(requestId, tabId, { type: "fail" });

    expect(sendCommand).toHaveBeenCalledWith({ tabId }, "Fetch.failRequest", {
      requestId,
      errorReason: "Failed",
    });
  });

  it("cleanup always runs: removePausedRequest + broadcast even if sendCommand throws", async () => {
    sendCommand.mockRejectedValueOnce(new Error("tab closed"));

    await expect(resolveRequest(requestId, tabId, { type: "continue" })).rejects.toThrow(
      "tab closed",
    );

    // Cleanup still happened
    expect(getState().pausedRequests.find((r) => r.requestId === requestId)).toBeUndefined();
    // broadcastToUI was called for both REQUEST_RESOLVED and STATE_UPDATED
    expect(runtimeSendMessage).toHaveBeenCalled();
  });
});
