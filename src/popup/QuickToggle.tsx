import React from "react";

interface Props {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export default function QuickToggle({ enabled, onToggle }: Props) {
  return (
    <div className="toggle-row">
      <span>Interception {enabled ? "Enabled" : "Disabled"}</span>
      <button
        className={`toggle-switch ${enabled ? "toggle-switch--on" : ""}`}
        onClick={() => onToggle(!enabled)}
        aria-label={enabled ? "Disable interception" : "Enable interception"}
      />
    </div>
  );
}
