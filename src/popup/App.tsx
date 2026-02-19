import { useEffect, useState } from "react";
import type { ExtensionState } from "@shared/types";
import type { BackgroundMessage } from "@shared/messages";
import { sendToBackground } from "@shared/messages";
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
    sendToBackground({ type: "GET_STATE" })
      .then(setState)
      .catch((err: unknown) => console.error("GET_STATE failed:", err));

    const listener = (message: BackgroundMessage) => {
      if (message.type === "STATE_UPDATED") {
        setState(message.state);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const handleToggle = (enabled: boolean) => {
    sendToBackground({ type: "SET_ENABLED", enabled })
      .then(setState)
      .catch((err: unknown) => console.error("SET_ENABLED failed:", err));
  };

  const openPanel = () => {
    void chrome.tabs.create({ url: chrome.runtime.getURL("panel.html") });
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
