import { CDP_VERSION } from "@shared/constants";
import type { InterceptRule } from "@shared/types";
import { getState, addAttachedTab, removeAttachedTab } from "./state";

function buildFetchPatterns(rules: InterceptRule[]) {
  const enabledRules = rules.filter((r) => r.enabled);
  if (enabledRules.length === 0) {
    return [];
  }

  return enabledRules.map((rule) => ({
    urlPattern: rule.urlPattern,
    requestStage: rule.requestStage,
  }));
}

export async function attachToTab(tabId: number): Promise<void> {
  await chrome.debugger.attach({ tabId }, CDP_VERSION);
  addAttachedTab(tabId);

  const patterns = buildFetchPatterns(getState().rules);
  await chrome.debugger.sendCommand({ tabId }, "Fetch.enable", {
    patterns: patterns.length > 0 ? patterns : [{ urlPattern: "*", requestStage: "Request" }],
  });
}

export async function detachFromTab(tabId: number): Promise<void> {
  try {
    await chrome.debugger.detach({ tabId });
  } catch (err) {
    console.warn("detachFromTab: debugger already detached", err);
  }
  removeAttachedTab(tabId);
}

export async function updatePatterns(tabId: number): Promise<void> {
  const patterns = buildFetchPatterns(getState().rules);
  try {
    await chrome.debugger.sendCommand({ tabId }, "Fetch.disable");
    await chrome.debugger.sendCommand({ tabId }, "Fetch.enable", {
      patterns: patterns.length > 0 ? patterns : [{ urlPattern: "*", requestStage: "Request" }],
    });
  } catch (err) {
    console.warn("updatePatterns: tab may have been closed", err);
  }
}

export async function updateAllTabs(): Promise<void> {
  const { attachedTabs } = getState();
  await Promise.all(attachedTabs.map(updatePatterns));
}

export function setupDebuggerListeners(): void {
  chrome.debugger.onDetach.addListener((source) => {
    if (source.tabId != null) {
      removeAttachedTab(source.tabId);
    }
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    const { attachedTabs } = getState();
    if (attachedTabs.includes(tabId)) {
      removeAttachedTab(tabId);
    }
  });
}
