import { InterceptRule } from "./types";

const RULES_KEY = "intercept_rules";
const ENABLED_KEY = "intercept_enabled";

const VALID_ACTION_TYPES = new Set(["pause", "modify-request", "mock-response", "proxy"]);
const VALID_STAGES = new Set(["Request", "Response"]);

function isValidRule(val: unknown): val is InterceptRule {
  if (typeof val !== "object" || val === null) return false;
  const obj = val as Record<string, unknown>;

  // Backfill httpMethods for rules saved before that field existed
  if (!Array.isArray(obj.httpMethods)) {
    obj.httpMethods = [];
  }

  return (
    typeof obj.id === "string" &&
    typeof obj.enabled === "boolean" &&
    typeof obj.urlPattern === "string" &&
    typeof obj.label === "string" &&
    typeof obj.requestStage === "string" &&
    VALID_STAGES.has(obj.requestStage as string) &&
    Array.isArray(obj.resourceTypes) &&
    Array.isArray(obj.httpMethods) &&
    typeof obj.action === "object" &&
    obj.action !== null &&
    VALID_ACTION_TYPES.has((obj.action as Record<string, unknown>).type as string)
  );
}

export async function loadRules(): Promise<InterceptRule[]> {
  const result = await chrome.storage.local.get(RULES_KEY);
  const raw = result[RULES_KEY];
  if (!Array.isArray(raw)) return [];
  return raw.filter((item) => {
    if (isValidRule(item)) return true;
    console.warn("loadRules: dropping invalid rule from storage:", item);
    return false;
  });
}

export async function saveRules(rules: InterceptRule[]): Promise<void> {
  await chrome.storage.local.set({ [RULES_KEY]: rules });
}

export async function loadEnabled(): Promise<boolean> {
  const result = await chrome.storage.local.get(ENABLED_KEY);
  const val = result[ENABLED_KEY];
  return typeof val === "boolean" ? val : false;
}

export async function saveEnabled(enabled: boolean): Promise<void> {
  await chrome.storage.local.set({ [ENABLED_KEY]: enabled });
}
