import { useState } from "react";
import type { PausedRequest } from "@shared/types";
import { usePanel } from "../context";
import type { Header } from "./HeadersEditor";
import HeadersEditor, { createHeader } from "./HeadersEditor";
import RequestBodyEditor from "./RequestBodyEditor";
import ResponseBodyEditor from "./ResponseBodyEditor";

interface Props {
  request: PausedRequest;
}

function toEditorHeaders(headers: Array<{ name: string; value: string }>): Header[] {
  return headers.map((h) => createHeader(h.name, h.value));
}

function fromEditorHeaders(headers: Header[]): Array<{ name: string; value: string }> {
  return headers.map(({ name, value }) => ({ name, value }));
}

export default function PausedRequestView({ request }: Props) {
  const { resolveRequest } = usePanel();

  const [headers, setHeaders] = useState(() => toEditorHeaders(request.headers));
  const [postData, setPostData] = useState(request.postData ?? "");
  const [responseBody, setResponseBody] = useState(request.responseBody ?? "");
  const [responseHeaders, setResponseHeaders] = useState(() =>
    toEditorHeaders(request.responseHeaders ?? []),
  );
  const [responseCode, setResponseCode] = useState(request.responseStatusCode ?? 200);
  const [mockMode, setMockMode] = useState(false);

  const isRequest = request.stage === "Request";

  const handleContinue = () => {
    if (isRequest) {
      if (mockMode) {
        resolveRequest(request.requestId, request.tabId, {
          type: "fulfill",
          responseCode,
          responseHeaders: fromEditorHeaders(responseHeaders),
          body: responseBody || undefined,
        });
      } else {
        resolveRequest(request.requestId, request.tabId, {
          type: "continue",
          modifications: {
            headers: fromEditorHeaders(headers),
            postData: postData || undefined,
          },
        });
      }
    } else {
      resolveRequest(request.requestId, request.tabId, {
        type: "continue-response",
        modifications: {
          responseCode,
          responseHeaders: fromEditorHeaders(responseHeaders),
          body: responseBody || undefined,
        },
      });
    }
  };

  const handleFail = () => {
    resolveRequest(request.requestId, request.tabId, {
      type: "fail",
      reason: "Failed",
    });
  };

  const continueDescription = isRequest
    ? mockMode
      ? "Send the mock response below"
      : "Forward request to the server"
    : "Return the response with your edits";

  return (
    <div className="request-detail">
      <div className="request-summary">
        <span className="request-method">{request.method}</span>
        <span className="request-url-full">{request.url}</span>
        {request.responseStatusCode && (
          <span className="request-status">{request.responseStatusCode}</span>
        )}
      </div>

      <div className="request-editors">
        <h3>Request Headers</h3>
        <HeadersEditor headers={headers} onChange={setHeaders} />

        {isRequest && (
          <>
            <h3>Request Body</h3>
            <RequestBodyEditor body={postData} onChange={setPostData} />

            <label className="mock-toggle">
              <input
                type="checkbox"
                checked={mockMode}
                onChange={(e) => setMockMode(e.target.checked)}
              />
              Mock response (skip the server)
            </label>

            {mockMode && (
              <div className="mock-response-section">
                <h3>Response Status</h3>
                <input
                  type="number"
                  className="status-input"
                  value={responseCode}
                  onChange={(e) => setResponseCode(Number(e.target.value))}
                />

                <h3>Response Headers</h3>
                <HeadersEditor headers={responseHeaders} onChange={setResponseHeaders} />

                <h3>Response Body</h3>
                <ResponseBodyEditor body={responseBody} onChange={setResponseBody} />
              </div>
            )}
          </>
        )}

        {!isRequest && (
          <>
            <h3>Response Status</h3>
            <input
              type="number"
              className="status-input"
              value={responseCode}
              onChange={(e) => setResponseCode(Number(e.target.value))}
            />

            <h3>Response Headers</h3>
            <HeadersEditor headers={responseHeaders} onChange={setResponseHeaders} />

            <h3>Response Body</h3>
            <ResponseBodyEditor body={responseBody} onChange={setResponseBody} />
          </>
        )}
      </div>

      <div className="request-actions">
        <div className="action-group">
          <button className="btn btn-primary" onClick={handleContinue}>
            {isRequest ? "Continue" : "Continue (with edits)"}
          </button>
          <span className="action-description">{continueDescription}</span>
        </div>
        <div className="action-group">
          <button className="btn btn-danger" onClick={handleFail}>
            Fail
          </button>
          <span className="action-description">Block with a network error</span>
        </div>
      </div>
    </div>
  );
}
