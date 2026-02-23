import { useState } from "react";
import { usePanel } from "../context";
import PausedRequestQueue from "./PausedRequestQueue";
import PausedRequestView from "./PausedRequestView";

export default function PausedRequestsView() {
  const { state, releaseAllRequests } = usePanel();
  const { pausedRequests } = state.extension;
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = pausedRequests.find((r) => r.requestId === selectedId) ?? null;

  if (pausedRequests.length === 0) {
    return (
      <div className="empty-state">
        No paused requests. Attach to a tab and create a &quot;pause&quot; rule to get started.
      </div>
    );
  }

  return (
    <div className="paused-view">
      <div className="paused-sidebar">
        <div className="paused-sidebar-header">
          <h3>Paused Requests</h3>
          <button className="btn btn-sm" onClick={releaseAllRequests}>
            Release All
          </button>
        </div>
        <PausedRequestQueue
          requests={pausedRequests}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </div>
      <div className="paused-detail">
        {selected ? (
          <PausedRequestView key={selected.requestId} request={selected} />
        ) : (
          <div className="empty-state">Select a paused request to inspect it.</div>
        )}
      </div>
    </div>
  );
}
