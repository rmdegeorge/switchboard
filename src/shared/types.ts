export type ResourceType =
  | "Document"
  | "Stylesheet"
  | "Image"
  | "Media"
  | "Font"
  | "Script"
  | "TextTrack"
  | "XHR"
  | "Fetch"
  | "Prefetch"
  | "EventSource"
  | "WebSocket"
  | "Manifest"
  | "SignedExchange"
  | "Ping"
  | "CSPViolationReport"
  | "Preflight"
  | "Other";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

export type RequestStage = "Request" | "Response";

export interface PauseAction {
  type: "pause";
}

export interface ModifyRequestAction {
  type: "modify-request";
  modifications: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    postData?: string;
  };
}

export interface MockResponseAction {
  type: "mock-response";
  response: {
    responseCode: number;
    responseHeaders?: Array<{ name: string; value: string }>;
    body?: string;
  };
}

export interface ProxyAction {
  type: "proxy";
  targetUrl: string;
}

export type RuleAction = PauseAction | ModifyRequestAction | MockResponseAction | ProxyAction;

export interface InterceptRule {
  id: string;
  enabled: boolean;
  urlPattern: string;
  resourceTypes: ResourceType[];
  httpMethods: HttpMethod[];
  requestStage: RequestStage;
  action: RuleAction;
  label: string;
}

export interface PausedRequest {
  requestId: string;
  tabId: number;
  ruleId: string;
  url: string;
  method: string;
  headers: Array<{ name: string; value: string }>;
  postData?: string;
  resourceType: string;
  stage: RequestStage;
  responseStatusCode?: number;
  responseHeaders?: Array<{ name: string; value: string }>;
  responseBody?: string;
  timestamp: number;
}

export type PausedRequestResolution =
  | {
      type: "continue";
      modifications?: {
        url?: string;
        method?: string;
        headers?: Array<{ name: string; value: string }>;
        postData?: string;
      };
    }
  | {
      type: "continue-response";
      modifications?: {
        responseCode?: number;
        responseHeaders?: Array<{ name: string; value: string }>;
        body?: string;
      };
    }
  | {
      type: "fulfill";
      responseCode: number;
      responseHeaders?: Array<{ name: string; value: string }>;
      body?: string;
    }
  | {
      type: "fail";
      reason?: string;
    };

export interface ExtensionState {
  enabled: boolean;
  rules: InterceptRule[];
  attachedTabs: number[];
  pausedRequests: PausedRequest[];
}
