# Northeast & Mid-Atlantic CRM (FaroMaker)

Salesforce-style CRM on top of the Northeast & Mid-Atlantic CRM board in Monday.com: contacts and map, follow-ups, Outlook calendar mirror, 2027 BD budget (imports the BD Plan Workbook), events (Ticketmaster, SeatGeek, team schedules), tickets & travel, and Food & drink.

Ported from the standalone single-file app in `orrymichael/northeast-mid-atlantic-acquisitions-dashboard` (`crm/standalone`). The screens and behavior are unchanged; what moved is where credentials live.

## Layout
- `src/main.js`, `src/styles.css`, `index.html`: the app (Vite, no framework). Leaflet and PostHog come from npm.
- `src/analytics.js`: PostHog via `posthog-js`.
- `server/app.js`: Express backend. `/api/monday` (token stays on the server), `/api/faros/*` (read-only passthrough), `/api/me`, `/api/health`; serves `dist/` in production.

## Run locally
```
cp .env.example .env     # fill in values (never commit it)
npm install
npm run build && npm start         # http://localhost:3000
# or, for frontend work: npm run dev:server  and  npm run dev
```

## Configuration
| Variable | Where | Purpose |
|---|---|---|
| `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST` | frontend (Hub injects) | PostHog project key and host |
| `MONDAY_TOKEN` | backend secret | Monday API token. With it set, the browser never holds a token and Settings no longer asks for one |
| `FAROS_BASE_URL`, `FAROS_API_KEY` (`FAROS_AUTH_HEADER`, `FAROS_AUTH_SCHEME`) | backend secret | FarOS API |
| `FAROMAKER_USER_HEADER` | backend | Request header carrying the signed-in FaroMaker user id (default `x-faromaker-user-id`) |

Without `MONDAY_TOKEN` the app falls back to the token typed in Settings, as the standalone version does.

## PostHog
Only runs when a key is present and the browser does not send Do Not Track. No autocapture, no session recording. Users are identified by FaroMaker user id only (no email). Events are names and counts: screens viewed, activities logged, events saved, Outlook connected, workbook imported, order emails scanned, food searches.

## Tests
`npm test` runs the backend tests and a browser smoke test (needs Playwright installed globally: `NODE_PATH=$(npm root -g)`). The smoke test builds with a PostHog key and checks identify-by-id and no PII.

## Not done yet / to confirm
- **FarOS data sync.** The passthrough is ready, but the app does not yet read deals or properties from FarOS: the endpoint paths and response shapes are needed first.
- **User id header.** `/api/me` assumes the platform forwards the user id in `x-faromaker-user-id`. Confirm the real mechanism with the FaroMaker team.
- **Hub deployment.** This scaffold was built without access to FaroMaker's template, so check build/start commands and env names against what Hub expects before promoting.
- **Other secrets.** Outlook client id, Ticketmaster and SeatGeek keys are still entered in Settings (browser-held). Move them to the backend if Faropoint wants them managed centrally.
- **Same-origin check only.** `/api/monday` relies on the platform's login in front of the app. Do not expose it publicly without that.
