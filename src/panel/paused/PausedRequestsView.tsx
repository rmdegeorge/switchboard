import React, { useState } from "react";
import { usePanel } from "../context";
import PausedRequestQueue from "./PausedRequestQueue";
import PausedRequestView from "./PausedRequestView";

export default function PausedRequestsView() {
  const { state } = usePanel();
  const { pausedRequests } = state.extension;
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = pausedRequests.find((r) => r.requestId === selectedId) ?? null;

  if (pausedRequests.length === 0) {
    return <div className="empty-state">No paused requests. Attach to a tab and create a "pause" rule to get started.</div>;
  }

  return (
    <div className="paused-view">
      <div className="paused-sidebar">
        <PausedRequestQueue
          requests={pausedRequests}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </div>
      <div className="paused-detail">
        {selected ? (
          <PausedRequestView request={selected} />
        ) : (
          <div className="empty-state">Select a paused request to inspect it.</div>
        )}
      </div>
    </div>
  );
}
