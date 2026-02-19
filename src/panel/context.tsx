import React, { createContext, useContext, useReducer, useEffect, useCallback } from "react";
import { ExtensionState, InterceptRule, PausedRequestResolution } from "@shared/types";
import { sendToBackground, BackgroundMessage } from "@shared/messages";

const initialState: ExtensionState = {
  enabled: false,
  rules: [],
  attachedTabs: [],
  pausedRequests: [],
};

type Action =
  | { type: "SET_STATE"; state: ExtensionState }
  | { type: "SET_VIEW"; view: PanelView };

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
    sendToBackground({ type: "GET_STATE" }).then((s) => dispatch({ type: "SET_STATE", state: s }));

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
    const s = await sendToBackground({ type: "SET_ENABLED", enabled });
    dispatch({ type: "SET_STATE", state: s });
  }, []);

  const addRule = useCallback(async (rule: InterceptRule) => {
    const s = await sendToBackground({ type: "ADD_RULE", rule });
    dispatch({ type: "SET_STATE", state: s });
  }, []);

  const updateRule = useCallback(async (rule: InterceptRule) => {
    const s = await sendToBackground({ type: "UPDATE_RULE", rule });
    dispatch({ type: "SET_STATE", state: s });
  }, []);

  const deleteRule = useCallback(async (ruleId: string) => {
    const s = await sendToBackground({ type: "DELETE_RULE", ruleId });
    dispatch({ type: "SET_STATE", state: s });
  }, []);

  const attachTab = useCallback(async (tabId: number) => {
    const s = await sendToBackground({ type: "ATTACH_TAB", tabId });
    dispatch({ type: "SET_STATE", state: s });
  }, []);

  const detachTab = useCallback(async (tabId: number) => {
    const s = await sendToBackground({ type: "DETACH_TAB", tabId });
    dispatch({ type: "SET_STATE", state: s });
  }, []);

  const resolveRequest = useCallback(
    async (requestId: string, tabId: number, resolution: PausedRequestResolution) => {
      const s = await sendToBackground({
        type: "RESOLVE_REQUEST",
        requestId,
        tabId,
        resolution,
      });
      dispatch({ type: "SET_STATE", state: s });
    },
    [],
  );

  return (
    <PanelContext.Provider
      value={{
        state,
        setView,
        setEnabled,
        addRule,
        updateRule,
        deleteRule,
        attachTab,
        detachTab,
        resolveRequest,
      }}
    >
      {children}
    </PanelContext.Provider>
  );
}

export function usePanel() {
  return useContext(PanelContext);
}
