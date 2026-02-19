import type { UIMessage } from "@shared/messages";
import type { ExtensionState } from "@shared/types";
import { saveRules, saveEnabled } from "@shared/storage";
import { getState, setState, addRule, updateRule, deleteRule, ready } from "./state";
import { attachToTab, detachFromTab, updateAllTabs } from "./debuggerManager";
import { resolveRequest } from "./fetchInterceptor";
import { broadcastStateUpdate } from "./index";

async function handleMessage(
  message: UIMessage,
  sender: chrome.runtime.MessageSender,
): Promise<ExtensionState> {
  // Validate sender is this extension
  if (sender.id !== chrome.runtime.id) {
    return getState();
  }

  // Reject non-UIMessage messages (e.g. broadcast self-delivery of BackgroundMessage)
  const UI_MESSAGE_TYPES: Set<string> = new Set<UIMessage["type"]>([
    "GET_STATE",
    "SET_ENABLED",
    "ADD_RULE",
    "UPDATE_RULE",
    "DELETE_RULE",
    "ATTACH_TAB",
    "DETACH_TAB",
    "RESOLVE_REQUEST",
  ]);
  if (!message?.type || !UI_MESSAGE_TYPES.has(message.type)) {
    return getState();
  }

  // Wait for state initialization before processing
  await ready;

  switch (message.type) {
    case "GET_STATE":
      return getState();

    case "SET_ENABLED": {
      setState({ enabled: message.enabled });
      await saveEnabled(message.enabled);
      broadcastStateUpdate();
      return getState();
    }

    case "ADD_RULE": {
      addRule(message.rule);
      await saveRules(getState().rules);
      await updateAllTabs();
      broadcastStateUpdate();
      return getState();
    }

    case "UPDATE_RULE": {
      updateRule(message.rule);
      await saveRules(getState().rules);
      await updateAllTabs();
      broadcastStateUpdate();
      return getState();
    }

    case "DELETE_RULE": {
      deleteRule(message.ruleId);
      await saveRules(getState().rules);
      await updateAllTabs();
      broadcastStateUpdate();
      return getState();
    }

    case "ATTACH_TAB": {
      await attachToTab(message.tabId);
      broadcastStateUpdate();
      return getState();
    }

    case "DETACH_TAB": {
      await detachFromTab(message.tabId);
      broadcastStateUpdate();
      return getState();
    }

    case "RESOLVE_REQUEST": {
      await resolveRequest(message.requestId, message.tabId, message.resolution);
      return getState();
    }

    default: {
      const _exhaustive: never = message;
      console.warn("Unhandled message type:", (_exhaustive as UIMessage).type);
      return getState();
    }
  }
}

export function setupMessageHandler(): void {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleMessage(message as UIMessage, sender)
      .then(sendResponse)
      .catch((err) => {
        console.error("handleMessage failed:", err);
        sendResponse(getState());
      });
    return true; // Keep the message channel open for async response
  });
}
