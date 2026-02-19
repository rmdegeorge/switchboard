import type { PausedRequest } from "@shared/types";

interface Props {
  requests: PausedRequest[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function PausedRequestQueue({ requests, selectedId, onSelect }: Props) {
  return (
    <div className="request-queue">
      <h3>Paused ({requests.length})</h3>
      <ul className="request-list">
        {requests.map((req) => (
          <li
            key={req.requestId}
            className={`request-item ${req.requestId === selectedId ? "request-item--selected" : ""}`}
            onClick={() => onSelect(req.requestId)}
          >
            <span className="request-method">{req.method}</span>
            <span className="request-url" title={req.url}>
              {new URL(req.url).pathname}
            </span>
            <span className="request-stage">{req.stage}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
