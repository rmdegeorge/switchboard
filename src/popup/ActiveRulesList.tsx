import React from "react";
import { InterceptRule } from "@shared/types";

interface Props {
  rules: InterceptRule[];
  pausedCount: number;
  attachedTabs: number;
}

export default function ActiveRulesList({ rules, pausedCount, attachedTabs }: Props) {
  const enabledRules = rules.filter((r) => r.enabled);

  return (
    <div className="rules-summary">
      <div className="rules-summary-item">
        <span className="rules-summary-label">Active Rules</span>
        <span className="rules-summary-value">{enabledRules.length}</span>
      </div>
      <div className="rules-summary-item">
        <span className="rules-summary-label">Attached Tabs</span>
        <span className="rules-summary-value">{attachedTabs}</span>
      </div>
      <div className="rules-summary-item">
        <span className="rules-summary-label">Paused Requests</span>
        <span className={`rules-summary-value ${pausedCount > 0 ? "paused-badge" : ""}`}>
          {pausedCount}
        </span>
      </div>
    </div>
  );
}
