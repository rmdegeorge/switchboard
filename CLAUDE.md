# CLAUDE.md — Switchboard

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
npm install          # Install dependencies
npm run dev          # Build in watch mode (development)
npm run build        # Production build → dist/
npm run type-check   # TypeScript type checking (no emit)
npm run lint         # ESLint
```

Load `dist/` as an unpacked extension in `chrome://extensions` (enable Developer mode). After code changes, reload the extension from that page.

## Architecture

**Manifest V3** Chrome extension using `chrome.debugger` API + Chrome DevTools Protocol (CDP) `Fetch` domain to intercept, pause, and modify network requests/responses.

### Three entry points (Vite builds each separately)

- **Background** (`src/background/`) — MV3 service worker. Manages debugger lifecycle, intercepts `Fetch.requestPaused` events, routes messages. Single source of truth for all extension state.
- **Popup** (`src/popup/`) — 350px popup from extension icon. Quick toggle, rule summary, link to full panel.
- **Panel** (`src/panel/`) — Full-page tab. Rule management, paused request editing (headers, body, response), continue/fulfill/fail actions. Uses React Context + `useReducer` for local state (`context.tsx`).

### Messaging flow

```
popup/panel  ──UIMessage──►  background service worker
                                    │
background  ──BackgroundMessage──►  popup/panel (broadcast)
```

All messages typed in `src/shared/messages.ts`. Every UI action sends a message to the background, which processes it, updates state, and broadcasts the new `ExtensionState` back.

### Key modules

| File | Purpose |
|------|---------|
| `src/shared/types.ts` | Core types: `InterceptRule`, `PausedRequest`, `RuleAction`, `PausedRequestResolution`, `ExtensionState` |
| `src/shared/messages.ts` | Typed `UIMessage` / `BackgroundMessage` unions + `sendToBackground` / `broadcastToUI` helpers |
| `src/shared/storage.ts` | `chrome.storage.local` wrapper for rules & enabled state (keys: `intercept_rules`, `intercept_enabled`) |
| `src/shared/constants.ts` | CDP version, default resource types, keep-alive interval |
| `src/background/state.ts` | In-memory state management (rules + attached tabs + paused requests) |
| `src/background/debuggerManager.ts` | `chrome.debugger` attach/detach, `Fetch.enable`/`Fetch.disable` pattern updates |
| `src/background/fetchInterceptor.ts` | CDP `Fetch.requestPaused` handler — rule matching, pause/modify/mock/proxy/resolve logic, base64 encoding |
| `src/background/messageHandler.ts` | Routes `UIMessage` types to appropriate handlers |
| `src/panel/context.tsx` | `PanelProvider` — React Context + `useReducer`, wraps all `sendToBackground` calls as action methods |

### Static assets

`public/` contains `manifest.json` and `icons/`. Vite copies these to `dist/` automatically. HTML entry points (`popup.html`, `panel.html`) live at the project root — Vite processes them as Rollup inputs and injects script/CSS tags.

## Key Technical Decisions

- **chrome.debugger + CDP Fetch**: Only way to truly pause and modify requests at both request and response stages. Requires "debugger" permission and shows Chrome's debugging banner.
- **MV3 service worker**: All listeners (`chrome.runtime.onMessage`, `chrome.debugger.onEvent`, `chrome.debugger.onDetach`) **must be registered synchronously** at the top level of `src/background/index.ts`. Async registration will be missed after worker restart.
- **Keep-alive**: Service workers die after ~30s idle. A `setInterval` pings `chrome.runtime.getPlatformInfo` while paused requests exist.
- **No eval**: MV3 CSP forbids eval. Vite uses standard sourcemaps (dev only).
- **Base64 encoding**: CDP expects base64 for request/response bodies. All `btoa`/`atob` conversion is in `fetchInterceptor.ts`.
- **Response modification**: Uses `Fetch.fulfillRequest` (not `continueResponse`) when the body or status needs to change.
- **Paused requests are ephemeral**: Stored in-memory only. Lost if service worker restarts. Rules are persisted in `chrome.storage.local`.
- **CSS**: Plain CSS. Vite extracts CSS to separate files and links them in HTML. No CSS framework.

## Tech Stack

- TypeScript 5.4+ with strict mode
- React 18 with `react-jsx` transform
- Vite 6 with single config (`vite.config.ts`)
- Path aliases: `@shared/*`, `@background/*`, `@popup/*`, `@panel/*` (single source of truth in `tsconfig.json`, read by `vite-tsconfig-paths`)
- ESLint with `@typescript-eslint/parser` (no strict TS rules enabled, `no-unused-vars` and `no-undef` off due to TypeScript handling those)
