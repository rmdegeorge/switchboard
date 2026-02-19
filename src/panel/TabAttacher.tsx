import { useState, useEffect } from "react";
import { usePanel } from "./context";

export default function TabAttacher() {
  const { state, attachTab, detachTab } = usePanel();
  const [tabs, setTabs] = useState<chrome.tabs.Tab[]>([]);

  useEffect(() => {
    chrome.tabs.query({}, (allTabs) => {
      setTabs(
        allTabs.filter(
          (t) =>
            t.id != null &&
            t.url &&
            !t.url.startsWith("chrome://") &&
            !t.url.startsWith("chrome-extension://"),
        ),
      );
    });
  }, []);

  const attachedSet = new Set(state.extension.attachedTabs);

  const handleToggle = (tabId: number) => {
    if (attachedSet.has(tabId)) {
      detachTab(tabId);
    } else {
      attachTab(tabId);
    }
  };

  return (
    <div className="tab-attacher">
      <select
        onChange={(e) => {
          const tabId = Number(e.target.value);
          if (tabId) handleToggle(tabId);
          e.target.value = "";
        }}
        defaultValue=""
      >
        <option value="" disabled>
          Attach to tab...
        </option>
        {tabs.map((tab) => (
          <option key={tab.id} value={tab.id}>
            {attachedSet.has(tab.id!) ? "[attached] " : ""}
            {tab.title?.slice(0, 50) || tab.url?.slice(0, 50)}
          </option>
        ))}
      </select>
      {state.extension.attachedTabs.length > 0 && (
        <span className="attached-count">
          {state.extension.attachedTabs.length} tab(s) attached
        </span>
      )}
    </div>
  );
}
