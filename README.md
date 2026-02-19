# Network Intercept

A Chrome extension that intercepts, pauses, and modifies network requests and responses in real-time using the Chrome DevTools Protocol.

## Features

- **Pause requests** — Stop a page when a specific API is hit, inspect the request, then let it continue
- **Modify requests** — Change URL, method, headers, or body before the request reaches the server
- **Mock responses** — Return a custom response without hitting the server at all
- **Modify responses** — Edit response status, headers, and body before the page receives them
- **Proxy requests** — Redirect requests to a different URL
- **Rule-based matching** — Define rules with URL patterns, HTTP method filters, resource type filters, and request stage targeting

## How It Works

The extension uses the `chrome.debugger` API to attach to browser tabs and leverages the Chrome DevTools Protocol (CDP) `Fetch` domain. This is the only approach that supports true request/response pausing and modification at both stages.

When attached to a tab, the extension intercepts network requests matching your rules. For "pause" rules, the request is held in memory and displayed in the panel UI where you can inspect and edit it before deciding to continue, mock, or abort.

## Getting Started

### Prerequisites

- Node.js 18+
- Google Chrome

### Install & Build

```bash
npm install
npm run build
```

### Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `dist/` folder

### Development

```bash
npm run dev        # Build with watch mode
npm run build      # Production build
npm run type-check # TypeScript checking
npm run lint       # ESLint
```

After changes, click the reload icon on the extension card in `chrome://extensions`.

## Usage

1. Click the extension icon to open the **popup** — use it to toggle interception on/off and see a summary
2. Click **Open Full Panel** to open the full management interface
3. **Create a rule** — set a URL pattern (e.g. `*://api.example.com/*`), select which HTTP methods to match, choose the stage (Request or Response), and pick an action (Pause, Modify, Mock, or Proxy)
4. **Attach to a tab** using the dropdown in the panel header
5. Navigate the attached tab to trigger matching requests
6. For "Pause" rules, paused requests appear in the **Paused Requests** tab where you can edit headers, body, and response data before continuing

## Architecture

```
src/
├── shared/           # Types, messaging, storage, constants
├── background/       # MV3 service worker
│   ├── index.ts          # Entry point, registers listeners
│   ├── state.ts          # In-memory state management
│   ├── debuggerManager.ts # chrome.debugger lifecycle
│   ├── fetchInterceptor.ts # CDP Fetch.requestPaused handling
│   └── messageHandler.ts  # Routes UI messages
├── popup/            # Extension popup (350px)
│   ├── App.tsx, index.tsx
│   ├── StatusIndicator.tsx
│   ├── QuickToggle.tsx
│   └── ActiveRulesList.tsx
└── panel/            # Full-page management UI
    ├── App.tsx, index.tsx, context.tsx
    ├── TabAttacher.tsx
    ├── rules/        # Rule CRUD components
    └── paused/       # Paused request editing components
```

**Messaging:** The popup and panel communicate with the background service worker via typed messages (`UIMessage` / `BackgroundMessage` in `src/shared/messages.ts`). The background is the single source of truth for all extension state.

## Limitations

- **Debugging banner** — Chrome shows an "is debugging this browser" banner on attached tabs. This is unavoidable when using the `chrome.debugger` API.
- **Service worker lifecycle** — MV3 service workers can be terminated after ~30s of inactivity. The extension uses a keep-alive interval while requests are paused, but paused requests are lost if the worker restarts.
- **One debugger at a time** — Chrome only allows one debugger client per tab. If DevTools is open with the Network panel, attaching may conflict.

## Tech Stack

- TypeScript 5 (strict mode)
- React 18
- Webpack 5 (three entry points: background, popup, panel)
- Manifest V3
