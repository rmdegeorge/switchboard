import { broadcastToUI } from "@shared/messages";
import { KEEP_ALIVE_INTERVAL_MS } from "@shared/constants";
import { getState, initState } from "./state";
import { setupDebuggerListeners } from "./debuggerManager";
import { setupFetchInterceptor } from "./fetchInterceptor";
import { setupMessageHandler } from "./messageHandler";

export function broadcastStateUpdate(): void {
  broadcastToUI({ type: "STATE_UPDATED", state: getState() });
}

// Register all listeners synchronously at top level (MV3 requirement)
setupMessageHandler();
setupDebuggerListeners();
setupFetchInterceptor();

// Keep service worker alive while requests are paused
setInterval(() => {
  const { pausedRequests } = getState();
  if (pausedRequests.length > 0) {
    // Sending a no-op to keep the service worker active
    chrome.runtime.getPlatformInfo(() => {});
  }
}, KEEP_ALIVE_INTERVAL_MS);

// Initialize state from storage
initState().then(() => {
  console.log("Network Intercept: Background initialized");
});
