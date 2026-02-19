import { describe, it, expect, beforeEach, vi } from "vitest";
import { loadRules, saveRules, loadEnabled, saveEnabled } from "../storage";

function makeValidRule(overrides: Record<string, unknown> = {}) {
  return {
    id: "rule-1",
    enabled: true,
    urlPattern: "https://example.com/*",
    label: "Test rule",
    requestStage: "Request",
    resourceTypes: ["XHR"],
    httpMethods: ["GET"],
    action: { type: "pause" },
    ...overrides,
  };
}

let storageData: Record<string, unknown>;

beforeEach(() => {
  storageData = {};

  const storageMock = {
    get: vi.fn((key: string) => Promise.resolve({ [key]: storageData[key] })),
    set: vi.fn((items: Record<string, unknown>) => {
      Object.assign(storageData, items);
      return Promise.resolve();
    }),
  };

  vi.stubGlobal("chrome", {
    storage: { local: storageMock },
  });
});

describe("loadRules", () => {
  it("returns valid rules from storage", async () => {
    storageData["intercept_rules"] = [makeValidRule()];
    const rules = await loadRules();
    expect(rules).toHaveLength(1);
    expect(rules[0].id).toBe("rule-1");
  });

  it("returns empty array when storage has no rules", async () => {
    const rules = await loadRules();
    expect(rules).toEqual([]);
  });

  it("returns empty array when storage value is not an array", async () => {
    storageData["intercept_rules"] = "not-an-array";
    const rules = await loadRules();
    expect(rules).toEqual([]);
  });

  it("drops invalid entries (missing fields)", async () => {
    storageData["intercept_rules"] = [makeValidRule(), { id: "bad", label: "missing stuff" }];
    const rules = await loadRules();
    expect(rules).toHaveLength(1);
    expect(rules[0].id).toBe("rule-1");
  });

  it("drops entries with wrong action type", async () => {
    storageData["intercept_rules"] = [makeValidRule({ action: { type: "invalid-action" } })];
    const rules = await loadRules();
    expect(rules).toEqual([]);
  });

  it("backfills httpMethods for legacy rules missing that field", async () => {
    const legacyRule = makeValidRule();
    delete (legacyRule as Record<string, unknown>).httpMethods;
    storageData["intercept_rules"] = [legacyRule];
    const rules = await loadRules();
    expect(rules).toHaveLength(1);
    expect(rules[0].httpMethods).toEqual([]);
  });
});

describe("saveRules", () => {
  it("writes rules to storage", async () => {
    const rules = [makeValidRule()] as Parameters<typeof saveRules>[0];
    await saveRules(rules);
    expect(storageData["intercept_rules"]).toEqual(rules);
  });
});

describe("loadEnabled", () => {
  it("returns false when absent", async () => {
    expect(await loadEnabled()).toBe(false);
  });

  it("returns false when value is not boolean", async () => {
    storageData["intercept_enabled"] = "yes";
    expect(await loadEnabled()).toBe(false);
  });

  it("returns the stored boolean value", async () => {
    storageData["intercept_enabled"] = true;
    expect(await loadEnabled()).toBe(true);
  });
});

describe("saveEnabled", () => {
  it("writes enabled state to storage", async () => {
    await saveEnabled(true);
    expect(storageData["intercept_enabled"]).toBe(true);
  });
});
