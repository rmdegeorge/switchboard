import { describe, it, expect, vi } from "vitest";
import type { InterceptRule } from "@shared/types";

// Stub chrome globals so module-level references don't blow up
vi.stubGlobal("chrome", {
  debugger: {
    attach: vi.fn(),
    detach: vi.fn(),
    sendCommand: vi.fn(),
    onDetach: { addListener: vi.fn() },
  },
  tabs: { onRemoved: { addListener: vi.fn() } },
  storage: {
    local: {
      get: vi.fn(() => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve()),
    },
  },
});

const { buildFetchPatterns } = await import("../debuggerManager");

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

describe("buildFetchPatterns", () => {
  it("empty rules → empty array", () => {
    expect(buildFetchPatterns([])).toEqual([]);
  });

  it("all disabled rules → empty array", () => {
    expect(
      buildFetchPatterns([
        makeRule({ id: "r1", enabled: false }),
        makeRule({ id: "r2", enabled: false }),
      ]),
    ).toEqual([]);
  });

  it("enabled rules → { urlPattern, requestStage } for each", () => {
    expect(
      buildFetchPatterns([
        makeRule({ id: "r1", urlPattern: "*foo*", requestStage: "Request" }),
        makeRule({ id: "r2", urlPattern: "*bar*", requestStage: "Response" }),
      ]),
    ).toEqual([
      { urlPattern: "*foo*", requestStage: "Request" },
      { urlPattern: "*bar*", requestStage: "Response" },
    ]);
  });

  it("mixed enabled/disabled → only enabled included", () => {
    expect(
      buildFetchPatterns([
        makeRule({ id: "r1", enabled: true, urlPattern: "*yes*", requestStage: "Request" }),
        makeRule({ id: "r2", enabled: false, urlPattern: "*no*", requestStage: "Request" }),
        makeRule({ id: "r3", enabled: true, urlPattern: "*also*", requestStage: "Response" }),
      ]),
    ).toEqual([
      { urlPattern: "*yes*", requestStage: "Request" },
      { urlPattern: "*also*", requestStage: "Response" },
    ]);
  });

  it("patterns pass through verbatim (not regex-converted)", () => {
    const result = buildFetchPatterns([makeRule({ urlPattern: "https://specific.com/path?q=*" })]);
    expect(result[0].urlPattern).toBe("https://specific.com/path?q=*");
  });
});
