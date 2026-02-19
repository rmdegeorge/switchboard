import { ExtensionState, InterceptRule, PausedRequest } from "@shared/types";
import { loadRules, loadEnabled } from "@shared/storage";

let state: ExtensionState = {
  enabled: false,
  rules: [],
  attachedTabs: [],
  pausedRequests: [],
};

let readyResolve!: () => void;
export const ready: Promise<void> = new Promise((resolve) => {
  readyResolve = resolve;
});

export function getState(): ExtensionState {
  return state;
}

export function setState(partial: Partial<ExtensionState>): void {
  state = { ...state, ...partial };
}

export function addPausedRequest(request: PausedRequest): void {
  state.pausedRequests = [...state.pausedRequests, request];
}

export function removePausedRequest(requestId: string): void {
  state.pausedRequests = state.pausedRequests.filter((r) => r.requestId !== requestId);
}

export function addAttachedTab(tabId: number): void {
  if (!state.attachedTabs.includes(tabId)) {
    state.attachedTabs = [...state.attachedTabs, tabId];
  }
}

export function removeAttachedTab(tabId: number): void {
  state.attachedTabs = state.attachedTabs.filter((id) => id !== tabId);
  state.pausedRequests = state.pausedRequests.filter((r) => r.tabId !== tabId);
}

export function updateRule(rule: InterceptRule): void {
  state.rules = state.rules.map((r) => (r.id === rule.id ? rule : r));
}

export function addRule(rule: InterceptRule): void {
  state.rules = [...state.rules, rule];
}

export function deleteRule(ruleId: string): void {
  state.rules = state.rules.filter((r) => r.id !== ruleId);
}

export async function initState(): Promise<void> {
  try {
    const [rules, enabled] = await Promise.all([loadRules(), loadEnabled()]);
    state.rules = rules;
    state.enabled = enabled;
  } catch (err) {
    console.error("initState: failed to load from storage, using defaults:", err);
  } finally {
    readyResolve();
  }
}
