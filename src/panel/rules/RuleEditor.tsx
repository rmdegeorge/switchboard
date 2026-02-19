import { useState } from "react";
import { ulid } from "ulid";
import { usePanel } from "../context";
import type { InterceptRule, RuleAction, RequestStage, HttpMethod } from "@shared/types";

interface Props {
  rule: InterceptRule | null;
  onClose: () => void;
}

const ALL_HTTP_METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

export default function RuleEditor({ rule, onClose }: Props) {
  const { addRule, updateRule } = usePanel();
  const isNew = rule === null;

  const [label, setLabel] = useState(rule?.label ?? "");
  const [urlPattern, setUrlPattern] = useState(rule?.urlPattern ?? "*");
  const [requestStage, setRequestStage] = useState<RequestStage>(rule?.requestStage ?? "Request");
  const [actionType, setActionType] = useState<RuleAction["type"]>(rule?.action.type ?? "pause");
  const [httpMethods, setHttpMethods] = useState<HttpMethod[]>(
    rule?.httpMethods?.length ? rule.httpMethods : [...ALL_HTTP_METHODS],
  );

  // Modify-request fields
  const [modUrl, setModUrl] = useState(
    rule?.action.type === "modify-request" ? (rule.action.modifications.url ?? "") : "",
  );
  const [modMethod, setModMethod] = useState(
    rule?.action.type === "modify-request" ? (rule.action.modifications.method ?? "") : "",
  );
  const [modPostData, setModPostData] = useState(
    rule?.action.type === "modify-request" ? (rule.action.modifications.postData ?? "") : "",
  );

  // Mock-response fields
  const [mockStatusCode, setMockStatusCode] = useState(
    rule?.action.type === "mock-response" ? rule.action.response.responseCode : 200,
  );
  const [mockBody, setMockBody] = useState(
    rule?.action.type === "mock-response" ? (rule.action.response.body ?? "") : "",
  );

  // Proxy fields
  const [proxyUrl, setProxyUrl] = useState(
    rule?.action.type === "proxy" ? rule.action.targetUrl : "",
  );

  const buildAction = (): RuleAction => {
    switch (actionType) {
      case "pause":
        return { type: "pause" };
      case "modify-request":
        return {
          type: "modify-request",
          modifications: {
            url: modUrl || undefined,
            method: modMethod || undefined,
            postData: modPostData || undefined,
          },
        };
      case "mock-response":
        return {
          type: "mock-response",
          response: {
            responseCode: mockStatusCode,
            body: mockBody || undefined,
          },
        };
      case "proxy":
        return { type: "proxy", targetUrl: proxyUrl };
    }
  };

  const handleSave = () => {
    const newRule: InterceptRule = {
      id: rule?.id ?? ulid(),
      enabled: rule?.enabled ?? true,
      label,
      urlPattern,
      resourceTypes: [],
      httpMethods,
      requestStage,
      action: buildAction(),
    };

    if (isNew) {
      addRule(newRule);
    } else {
      updateRule(newRule);
    }
    onClose();
  };

  return (
    <div className="rule-editor">
      <h2>{isNew ? "Create Rule" : "Edit Rule"}</h2>

      <div className="form-group">
        <label>Label</label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="My rule"
        />
      </div>

      <div className="form-group">
        <label>URL Pattern</label>
        <input
          type="text"
          value={urlPattern}
          onChange={(e) => setUrlPattern(e.target.value)}
          placeholder="*://api.example.com/*"
        />
      </div>

      <div className="form-group">
        <label>HTTP Methods</label>
        <div className="checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={httpMethods.length === ALL_HTTP_METHODS.length}
              ref={(el) => {
                if (el)
                  el.indeterminate =
                    httpMethods.length > 0 && httpMethods.length < ALL_HTTP_METHODS.length;
              }}
              onChange={(e) => {
                setHttpMethods(e.target.checked ? [...ALL_HTTP_METHODS] : []);
              }}
            />
            <strong>Select All</strong>
          </label>
          {ALL_HTTP_METHODS.map((method) => (
            <label key={method} className="checkbox-label">
              <input
                type="checkbox"
                checked={httpMethods.includes(method)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setHttpMethods([...httpMethods, method]);
                  } else {
                    setHttpMethods(httpMethods.filter((m) => m !== method));
                  }
                }}
              />
              {method}
            </label>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>Stage</label>
        <select
          value={requestStage}
          onChange={(e) => setRequestStage(e.target.value as RequestStage)}
        >
          <option value="Request">Request</option>
          <option value="Response">Response</option>
        </select>
      </div>

      <div className="form-group">
        <label>Action</label>
        <select
          value={actionType}
          onChange={(e) => setActionType(e.target.value as RuleAction["type"])}
        >
          <option value="pause">Pause</option>
          <option value="modify-request">Modify Request</option>
          <option value="mock-response">Mock Response</option>
          <option value="proxy">Proxy</option>
        </select>
      </div>

      {actionType === "modify-request" && (
        <div className="action-config">
          <div className="form-group">
            <label>Redirect URL (optional)</label>
            <input type="text" value={modUrl} onChange={(e) => setModUrl(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Method (optional)</label>
            <input type="text" value={modMethod} onChange={(e) => setModMethod(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Post Data (optional)</label>
            <textarea
              value={modPostData}
              onChange={(e) => setModPostData(e.target.value)}
              rows={4}
            />
          </div>
        </div>
      )}

      {actionType === "mock-response" && (
        <div className="action-config">
          <div className="form-group">
            <label>Status Code</label>
            <input
              type="number"
              value={mockStatusCode}
              onChange={(e) => setMockStatusCode(Number(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label>Response Body</label>
            <textarea value={mockBody} onChange={(e) => setMockBody(e.target.value)} rows={8} />
          </div>
        </div>
      )}

      {actionType === "proxy" && (
        <div className="action-config">
          <div className="form-group">
            <label>Target URL</label>
            <input
              type="text"
              value={proxyUrl}
              onChange={(e) => setProxyUrl(e.target.value)}
              placeholder="https://other-server.com/api"
            />
          </div>
        </div>
      )}

      <div className="form-actions">
        <button className="btn btn-primary" onClick={handleSave}>
          {isNew ? "Create" : "Save"}
        </button>
        <button className="btn" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
