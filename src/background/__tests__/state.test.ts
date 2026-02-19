import { describe, it, expect, beforeEach, vi } from "vitest";
import type { InterceptRule, PausedRequest } from "@shared/types";

// Stub chrome.storage before importing state (which imports storage at module level)
vi.stubGlobal("chrome", {
  storage: {
    local: {
      get: vi.fn(() => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve()),
    },
  },
});

// Dynamic import so the stub is in place first
const {
  getState,
  setState,
  addPausedRequest,
  removePausedRequest,
  addAttachedTab,
  removeAttachedTab,
  updateRule,
  addRule,
  deleteRule,
} = await import("../state");

function makeRule(id: string): InterceptRule {
  return {
    id,
    enabled: true,
    urlPattern: "*",
    label: `Rule ${id}`,
    requestStage: "Request",
    resourceTypes: ["XHR"],
    httpMethods: [],
    action: { type: "pause" },
  };
}

function makePausedRequest(requestId: string, tabId: number): PausedRequest {
  return {
    requestId,
    tabId,
    ruleId: "rule-1",
    url: "https://example.com",
    method: "GET",
    headers: [],
    resourceType: "XHR",
    stage: "Request",
    timestamp: Date.now(),
  };
}

beforeEach(() => {
  // Reset state between tests
  setState({
    enabled: false,
    rules: [],
    attachedTabs: [],
    pausedRequests: [],
  });
});

describe("state management", () => {
  describe("addPausedRequest / removePausedRequest", () => {
    it("adds a paused request", () => {
      const req = makePausedRequest("req-1", 1);
      addPausedRequest(req);
      expect(getState().pausedRequests).toHaveLength(1);
      expect(getState().pausedRequests[0].requestId).toBe("req-1");
    });

    it("removes a paused request by ID", () => {
      addPausedRequest(makePausedRequest("req-1", 1));
      addPausedRequest(makePausedRequest("req-2", 1));
      removePausedRequest("req-1");
      expect(getState().pausedRequests).toHaveLength(1);
      expect(getState().pausedRequests[0].requestId).toBe("req-2");
    });
  });

  describe("addAttachedTab / removeAttachedTab", () => {
    it("adds a tab", () => {
      addAttachedTab(1);
      expect(getState().attachedTabs).toEqual([1]);
    });

    it("does not add duplicate tabs", () => {
      addAttachedTab(1);
      addAttachedTab(1);
      expect(getState().attachedTabs).toEqual([1]);
    });

    it("removes a tab", () => {
      addAttachedTab(1);
      addAttachedTab(2);
      removeAttachedTab(1);
      expect(getState().attachedTabs).toEqual([2]);
    });

    it("also purges paused requests for that tab", () => {
      addAttachedTab(1);
      addAttachedTab(2);
      addPausedRequest(makePausedRequest("req-1", 1));
      addPausedRequest(makePausedRequest("req-2", 2));
      removeAttachedTab(1);
      expect(getState().pausedRequests).toHaveLength(1);
      expect(getState().pausedRequests[0].tabId).toBe(2);
    });
  });

  describe("addRule / updateRule / deleteRule", () => {
    it("adds a rule", () => {
      addRule(makeRule("r1"));
      expect(getState().rules).toHaveLength(1);
      expect(getState().rules[0].id).toBe("r1");
    });

    it("updates a rule in place", () => {
      addRule(makeRule("r1"));
      const updated = { ...makeRule("r1"), label: "Updated" };
      updateRule(updated);
      expect(getState().rules).toHaveLength(1);
      expect(getState().rules[0].label).toBe("Updated");
    });

    it("deletes a rule by ID", () => {
      addRule(makeRule("r1"));
      addRule(makeRule("r2"));
      deleteRule("r1");
      expect(getState().rules).toHaveLength(1);
      expect(getState().rules[0].id).toBe("r2");
    });
  });
});
