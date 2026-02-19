import type {
  ExtensionState,
  InterceptRule,
  PausedRequest,
  PausedRequestResolution,
} from "./types";

// Messages from UI (popup/panel) → background
export type UIMessage =
  | { type: "GET_STATE" }
  | { type: "SET_ENABLED"; enabled: boolean }
  | { type: "ADD_RULE"; rule: InterceptRule }
  | { type: "UPDATE_RULE"; rule: InterceptRule }
  | { type: "DELETE_RULE"; ruleId: string }
  | { type: "ATTACH_TAB"; tabId: number }
  | { type: "DETACH_TAB"; tabId: number }
  | {
      type: "RESOLVE_REQUEST";
      requestId: string;
      tabId: number;
      resolution: PausedRequestResolution;
    };

// Messages from background → UI
export type BackgroundMessage =
  | { type: "STATE_UPDATED"; state: ExtensionState }
  | { type: "REQUEST_PAUSED"; request: PausedRequest }
  | { type: "REQUEST_RESOLVED"; requestId: string };

export function sendToBackground(message: UIMessage): Promise<ExtensionState> {
  return chrome.runtime.sendMessage(message);
}

export function broadcastToUI(message: BackgroundMessage): void {
  chrome.runtime.sendMessage(message).catch((err: unknown) => {
    console.debug("broadcastToUI: no listeners", err instanceof Error ? err.message : err);
  });
}
