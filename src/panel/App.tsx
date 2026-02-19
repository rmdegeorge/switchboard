import React from "react";
import { PanelProvider, usePanel } from "./context";
import RulesView from "./rules/RulesView";
import PausedRequestsView from "./paused/PausedRequestsView";
import TabAttacher from "./TabAttacher";

function PanelContent() {
  const { state, setView, setEnabled } = usePanel();
  const { extension, view } = state;
  const pausedCount = extension.pausedRequests.length;

  return (
    <div className="panel">
      <header className="panel-header">
        <h1>Network Intercept</h1>
        <div className="panel-header-controls">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={extension.enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            <span>{extension.enabled ? "Enabled" : "Disabled"}</span>
          </label>
          <TabAttacher />
        </div>
      </header>

      <nav className="panel-nav">
        <button
          className={`nav-tab ${view === "rules" ? "nav-tab--active" : ""}`}
          onClick={() => setView("rules")}
        >
          Rules ({extension.rules.length})
        </button>
        <button
          className={`nav-tab ${view === "paused" ? "nav-tab--active" : ""}`}
          onClick={() => setView("paused")}
        >
          Paused Requests {pausedCount > 0 && <span className="badge">{pausedCount}</span>}
        </button>
      </nav>

      <main className="panel-main">
        {view === "rules" ? <RulesView /> : <PausedRequestsView />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <PanelProvider>
      <PanelContent />
    </PanelProvider>
  );
}
