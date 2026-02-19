import React from "react";
import { usePanel } from "../context";
import { InterceptRule } from "@shared/types";

interface Props {
  onEdit: (rule: InterceptRule) => void;
}

export default function RuleList({ onEdit }: Props) {
  const { state, updateRule, deleteRule } = usePanel();
  const { rules } = state.extension;

  if (rules.length === 0) {
    return <div className="empty-state">No rules yet. Create one to get started.</div>;
  }

  const handleToggle = (rule: InterceptRule) => {
    updateRule({ ...rule, enabled: !rule.enabled });
  };

  return (
    <table className="rule-table">
      <thead>
        <tr>
          <th>On</th>
          <th>Label</th>
          <th>URL Pattern</th>
          <th>Method</th>
          <th>Stage</th>
          <th>Action</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {rules.map((rule) => (
          <tr key={rule.id} className={rule.enabled ? "" : "rule-disabled"}>
            <td>
              <input
                type="checkbox"
                checked={rule.enabled}
                onChange={() => handleToggle(rule)}
              />
            </td>
            <td>{rule.label}</td>
            <td className="mono">{rule.urlPattern}</td>
            <td>{!rule.httpMethods?.length || rule.httpMethods.length === 7 ? "All" : rule.httpMethods.join(", ")}</td>
            <td>{rule.requestStage}</td>
            <td>{rule.action.type}</td>
            <td>
              <button className="btn btn-sm" onClick={() => onEdit(rule)}>
                Edit
              </button>
              <button className="btn btn-sm btn-danger" onClick={() => deleteRule(rule.id)}>
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
