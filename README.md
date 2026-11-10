# Certified Partners AI — combined review console

Rhett's review console is the main site. Tanner's newer scoring-rules editor replaces Rhett's rules screen. The existing CertifiedPartnersAI Express/MCP server remains the deployment entry point. No frontend build step is required.

## Drop-in installation

1. Extract the ZIP on your computer. Copy its CONTENTS into the root of your existing CertifiedPartnersAI checkout, allowing matching files to be replaced. `package.json`, `public`, `src`, and `data` should sit directly in the repository root, not in a nested folder. Keep your private `.env` file if you have one; no secrets are included here.
2. Commit and push the changed files to the same GitHub repository/branch Render already uses. Do not upload the ZIP itself as the deployment.
3. On the existing Render **Web Service**, use build command `npm ci`, start command `npm start`, health check `/health`, and leave Root Directory blank if the app is at the repo root. Changing render.yaml alone does not update manually configured service settings.
4. Keep `ENABLE_PREVIEW` unset or set it to `true` to show the console. `ENABLE_PREVIEW=false` intentionally disables the dashboard, dashboard API, templates and workbook preview. `/health` and `/mcp` remain available.
5. Deploy the latest commit. The existing service URL now opens the review queue.

Local use: Node 22 or newer; `npm ci`, `npm test`, `npm start`, then open http://localhost:3000. Do not double-click index.html: the UI now requires its backend.

## Routes

- `/` — Rhett's review queue, lead review and email review
- `/scoring-rules.html` — Tanner's editor, including weight sliders, industry lists, size ranges and thresholds
- `/#/scraper` — scraper placeholder
- `/reference` — previous homepage with exact MCP templates, workbook and endpoint URLs
- `/templates`, `/data`, `/health`, `/mcp` — existing routes preserved
- `/api/:action` — dashboard actions; JSON POST body `{ "args": [...] }`

## What works now

Server-backed lead review, reject/reopen, editable demo drafts, demo email approval, scoring-rule saves, re-scoring open leads, reset sample data. Tanner's page and Rhett's pages share one rules store. Input validation and eligibility/approval-order checks run on the server. The existing three MCP tools and original workbook/template logic are retained.

## Deliberate boundaries

This is a public, fictional-data demo, following the existing repository's unauthenticated demo setup. Anyone with its URL can change/reset shared dashboard sample data. Do not enter real contact records until authentication and access controls are added. The existing `MCP_API_KEY` variable was already unused by default in the supplied server; this package preserves that behavior rather than breaking your current ChatGPT connector. Tests still cover explicitly configured bearer authentication.

The UI's 0–100 ICP fit score is separate from the MCP's 0–12 information completeness score. Editing fit rules does not alter the four MCP template thresholds. Dashboard records are Rhett's fictional samples; the original 30-case workbook remains available through MCP and `/reference`. They are not silently merged or assigned invented facts.

AI, Apollo, live research/scraping, email delivery and actual scheduling are NOT connected. Draft regeneration uses a deterministic demo writer. The legacy internal `sent` bucket is labelled Demo approvals in the interface and must not be interpreted as delivery. Nothing leaves this app by email.

## Saved state on Render

By default state is written atomically to `.runtime/dashboard.json`. This survives application restarts only when that file remains on disk. Ordinary ephemeral hosting storage can be lost on restart/redeploy. This mode is sufficient for a disposable demo.

For durable single-instance storage, attach a persistent disk through Render, choose its mount path (for example `/var/data`), and set `DASHBOARD_STATE_FILE=/var/data/dashboard.json`. No disk is created automatically or charged by this ZIP. For multiple server instances, replace the JSON store with a shared database first. Do not commit `.runtime` or `.env`.

Reset sample data resets dashboard records and fit rules; it does not modify the original workbook or MCP templates.

## Implementation

- `public/`: Rhett shell and screens; Tanner scoring HTML/CSS and recovered preview JavaScript.
- `public/js/api.js`: same-origin HTTP adapter replacing browser-only localStorage.
- `src/dashboard/router.js`: validated dashboard API and file persistence.
- `src/dashboard/demo-engine.cjs`: Rhett's original demo behavior hosted in an isolated JS context; only bundled trusted source is evaluated, never request code.
- `src/selection.js`, `src/templates.js`, `data/workbook.json`: existing MCP assets preserved.

See `docs/SOURCES.md` for exact upstream revisions and `docs/VALIDATION.md` for checks and limitations.
