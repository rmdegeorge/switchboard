import { InterceptRule } from "./types";

const RULES_KEY = "intercept_rules";
const ENABLED_KEY = "intercept_enabled";

export async function loadRules(): Promise<InterceptRule[]> {
  const result = await chrome.storage.local.get(RULES_KEY);
  return result[RULES_KEY] ?? [];
}

export async function saveRules(rules: InterceptRule[]): Promise<void> {
  await chrome.storage.local.set({ [RULES_KEY]: rules });
}

export async function loadEnabled(): Promise<boolean> {
  const result = await chrome.storage.local.get(ENABLED_KEY);
  return result[ENABLED_KEY] ?? false;
}

export async function saveEnabled(enabled: boolean): Promise<void> {
  await chrome.storage.local.set({ [ENABLED_KEY]: enabled });
}
