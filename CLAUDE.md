# Network Intercept Chrome Extension

## Build Commands

```bash
npm install          # Install dependencies
npm run dev          # Build in watch mode (development)
npm run build        # Production build → dist/
npm run type-check   # TypeScript type checking (no emit)
npm run lint         # ESLint
```

Load `dist/` as an unpacked extension in `chrome://extensions` (enable Developer mode).

## Architecture

**Manifest V3** Chrome extension using `chrome.debugger` API + Chrome DevTools Protocol (CDP) `Fetch` domain to intercept, pause, and modify network requests/responses.

### Three entry points

- **Background** (`src/background/`) — MV3 service worker. Manages debugger lifecycle, intercepts `Fetch.requestPaused` events, routes messages.
- **Popup** (`src/popup/`) — 350px popup from extension icon. Quick toggle, rule summary, link to full panel.
- **Panel** (`src/panel/`) — Full-page tab. Rule management, paused request editing (headers, body, response), continue/fulfill/fail actions.

### Messaging flow

```
popup/panel  ──UIMessage──►  background service worker
                                    │
background  ──BackgroundMessage──►  popup/panel (broadcast)
```

All messages typed in `src/shared/messages.ts`. The background is the single source of truth for extension state.

### Key modules

| File | Purpose |
|------|---------|
| `src/shared/types.ts` | Core types: `InterceptRule`, `PausedRequest`, `RuleAction`, etc. |
| `src/shared/messages.ts` | Typed `UIMessage` / `BackgroundMessage` + helpers |
| `src/shared/storage.ts` | `chrome.storage.local` wrapper for rules & enabled state |
| `src/background/state.ts` | In-memory state management |
| `src/background/debuggerManager.ts` | `chrome.debugger` attach/detach/pattern updates |
| `src/background/fetchInterceptor.ts` | CDP `Fetch.requestPaused` handling + resolution |
| `src/background/messageHandler.ts` | Routes UI messages to handlers |
| `src/panel/context.tsx` | React Context + useReducer for panel state |

## Key Technical Decisions

- **chrome.debugger + CDP Fetch**: Only way to truly pause and modify requests at both request and response stages. Requires "debugger" permission and shows Chrome's debugging banner.
- **MV3 service worker**: Listeners registered synchronously at top level. Keep-alive interval while requests are paused (workers die after ~30s idle).
- **No eval**: MV3 CSP forbids eval. Webpack devtool uses `cheap-module-source-map` (not eval-based).
- **Base64 encoding**: CDP expects base64 for request/response bodies. Encode/decode handled in `fetchInterceptor.ts`.
- **Response modification**: Uses `Fetch.fulfillRequest` (not `continueResponse`) when the body needs to change.
- **Paused requests are ephemeral**: Stored in-memory only. Lost if service worker restarts. Rules are persisted in `chrome.storage.local`.

## Tech Stack

- TypeScript 5.4+ with strict mode
- React 18 with `react-jsx` transform
- Webpack 5 with JS configs (`webpack.common.js`, `webpack.dev.js`, `webpack.prod.js`)
- Three entry points: background, popup, panel
- Path aliases: `@shared/*`, `@background/*`, `@popup/*`, `@panel/*`
- `ts-loader` with `transpileOnly: true` (type-checking via separate `npm run type-check`)
