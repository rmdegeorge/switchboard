import React, { useState } from "react";
import { usePanel } from "../context";
import RuleList from "./RuleList";
import RuleEditor from "./RuleEditor";
import { InterceptRule } from "@shared/types";

export default function RulesView() {
  const [editingRule, setEditingRule] = useState<InterceptRule | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="rules-view">
      {creating || editingRule ? (
        <RuleEditor
          rule={editingRule}
          onClose={() => {
            setEditingRule(null);
            setCreating(false);
          }}
        />
      ) : (
        <>
          <div className="rules-toolbar">
            <button className="btn btn-primary" onClick={() => setCreating(true)}>
              + New Rule
            </button>
          </div>
          <RuleList onEdit={setEditingRule} />
        </>
      )}
    </div>
  );
}
