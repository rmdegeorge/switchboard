import React, { createContext, useContext, useReducer, useEffect, useCallback } from "react";
import type { ExtensionState, InterceptRule, PausedRequestResolution } from "@shared/types";
import type { BackgroundMessage } from "@shared/messages";
import { sendToBackground } from "@shared/messages";

const initialState: ExtensionState = {
  enabled: false,
  rules: [],
  attachedTabs: [],
  pausedRequests: [],
};

type Action = { type: "SET_STATE"; state: ExtensionState } | { type: "SET_VIEW"; view: PanelView };

export type PanelView = "rules" | "paused";

interface PanelState {
  extension: ExtensionState;
  view: PanelView;
}

function reducer(state: PanelState, action: Action): PanelState {
  switch (action.type) {
    case "SET_STATE":
      return { ...state, extension: action.state };
    case "SET_VIEW":
      return { ...state, view: action.view };
    default:
      return state;
  }
}

interface PanelContextValue {
  state: PanelState;
  setView: (view: PanelView) => void;
  setEnabled: (enabled: boolean) => void;
  addRule: (rule: InterceptRule) => void;
  updateRule: (rule: InterceptRule) => void;
  deleteRule: (ruleId: string) => void;
  attachTab: (tabId: number) => void;
  detachTab: (tabId: number) => void;
  resolveRequest: (requestId: string, tabId: number, resolution: PausedRequestResolution) => void;
}

const PanelContext = createContext<PanelContextValue>(null!);

export function PanelProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    extension: initialState,
    view: "rules" as PanelView,
  });

  useEffect(() => {
    sendToBackground({ type: "GET_STATE" })
      .then((s) => dispatch({ type: "SET_STATE", state: s }))
      .catch((err) => console.error("GET_STATE failed:", err));

    const listener = (message: BackgroundMessage) => {
      if (message.type === "STATE_UPDATED") {
        dispatch({ type: "SET_STATE", state: message.state });
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const setView = useCallback((view: PanelView) => dispatch({ type: "SET_VIEW", view }), []);

  const setEnabled = useCallback(async (enabled: boolean) => {
    try {
      const s = await sendToBackground({ type: "SET_ENABLED", enabled });
      dispatch({ type: "SET_STATE", state: s });
    } catch (err) {
      console.error("setEnabled failed:", err);
    }
  }, []);

  const addRule = useCallback(async (rule: InterceptRule) => {
    try {
      const s = await sendToBackground({ type: "ADD_RULE", rule });
      dispatch({ type: "SET_STATE", state: s });
    } catch (err) {
      console.error("addRule failed:", err);
    }
  }, []);

  const updateRule = useCallback(async (rule: InterceptRule) => {
    try {
      const s = await sendToBackground({ type: "UPDATE_RULE", rule });
      dispatch({ type: "SET_STATE", state: s });
    } catch (err) {
      console.error("updateRule failed:", err);
    }
  }, []);

  const deleteRule = useCallback(async (ruleId: string) => {
    try {
      const s = await sendToBackground({ type: "DELETE_RULE", ruleId });
      dispatch({ type: "SET_STATE", state: s });
    } catch (err) {
      console.error("deleteRule failed:", err);
    }
  }, []);

  const attachTab = useCallback(async (tabId: number) => {
    try {
      const s = await sendToBackground({ type: "ATTACH_TAB", tabId });
      dispatch({ type: "SET_STATE", state: s });
    } catch (err) {
      console.error("attachTab failed:", err);
    }
  }, []);

  const detachTab = useCallback(async (tabId: number) => {
    try {
      const s = await sendToBackground({ type: "DETACH_TAB", tabId });
      dispatch({ type: "SET_STATE", state: s });
    } catch (err) {
      console.error("detachTab failed:", err);
    }
  }, []);

  const resolveRequest = useCallback(
    async (requestId: string, tabId: number, resolution: PausedRequestResolution) => {
      try {
        const s = await sendToBackground({
          type: "RESOLVE_REQUEST",
          requestId,
          tabId,
          resolution,
        });
        dispatch({ type: "SET_STATE", state: s });
      } catch (err) {
        console.error("resolveRequest failed:", err);
      }
    },
    [],
  );

  return (
    <PanelContext.Provider
      value={{
        state,
        setView,
        setEnabled: (enabled: boolean) => void setEnabled(enabled),
        addRule: (rule: InterceptRule) => void addRule(rule),
        updateRule: (rule: InterceptRule) => void updateRule(rule),
        deleteRule: (ruleId: string) => void deleteRule(ruleId),
        attachTab: (tabId: number) => void attachTab(tabId),
        detachTab: (tabId: number) => void detachTab(tabId),
        resolveRequest: (requestId: string, tabId: number, resolution: PausedRequestResolution) =>
          void resolveRequest(requestId, tabId, resolution),
      }}
    >
      {children}
    </PanelContext.Provider>
  );
}

export function usePanel() {
  return useContext(PanelContext);
}
