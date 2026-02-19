import React, { useEffect, useState } from "react";
import { ExtensionState } from "@shared/types";
import { sendToBackground, BackgroundMessage } from "@shared/messages";
import StatusIndicator from "./StatusIndicator";
import QuickToggle from "./QuickToggle";
import ActiveRulesList from "./ActiveRulesList";

const initialState: ExtensionState = {
  enabled: false,
  rules: [],
  attachedTabs: [],
  pausedRequests: [],
};

export default function App() {
  const [state, setState] = useState<ExtensionState>(initialState);

  useEffect(() => {
    sendToBackground({ type: "GET_STATE" }).then(setState);

    const listener = (message: BackgroundMessage) => {
      if (message.type === "STATE_UPDATED") {
        setState(message.state);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const handleToggle = async (enabled: boolean) => {
    const newState = await sendToBackground({ type: "SET_ENABLED", enabled });
    setState(newState);
  };

  const openPanel = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("panel.html") });
  };

  return (
    <div className="popup">
      <div className="popup-header">
        <h1>Network Intercept</h1>
        <StatusIndicator active={state.enabled && state.attachedTabs.length > 0} />
      </div>

      <QuickToggle enabled={state.enabled} onToggle={handleToggle} />

      <ActiveRulesList
        rules={state.rules}
        pausedCount={state.pausedRequests.length}
        attachedTabs={state.attachedTabs.length}
      />

      <button className="open-panel-btn" onClick={openPanel}>
        Open Full Panel
      </button>
    </div>
  );
}
