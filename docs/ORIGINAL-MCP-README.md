# Outreach template MCP server

A small Node.js server that selects a template and returns the data and instructions an MCP-connected AI needs to draft an email. No AI API key is needed here: your connected AI does the writing. Email sending and scraping are later additions.

## Run locally (PowerShell or terminal)

Install Node.js 22 or newer, then run these commands inside this folder:

```
npm ci
```

Copy `.env.example` to `.env` and set a long random `MCP_API_KEY`. In PowerShell: `Copy-Item .env.example .env`.

```
npm start
```

Endpoint: `http://localhost:3000/mcp`. Health: `http://localhost:3000/health`.
Clients must support Streamable HTTP and an `Authorization: Bearer YOUR_KEY` header. This prototype uses a shared API key, not an OAuth login flow. A client requiring OAuth needs that integration added later.

## Deploy on Render

1. Extract the project and upload its contents to a GitHub repository, excluding `.env` and `node_modules`.
2. Create a Render Blueprint from that repository using `render.yaml`, or create a Node Web Service manually.
3. For a manual service: build `npm ci`, start `npm start`, health path `/health`, Node 22, `NODE_ENV=production`, and a long random `MCP_API_KEY`.
4. The Blueprint generates an API key. Retrieve its value from Render environment settings for your MCP client.
5. Connect to `https://YOUR-SERVICE.onrender.com/mcp` with the bearer header.

The server binds `0.0.0.0` using Render's `PORT`. Hosting has not been deployed as part of this download.
Browser requests with an Origin header are rejected unless explicitly listed in `ALLOWED_ORIGINS`. This prototype does not include browser CORS support; use a server-side MCP client.

## Tools

- `list_outreach_cases`: list the 30 example case IDs.
- `list_email_templates`: view the four template bodies and thresholds.
- `prepare_email_brief`: select a template and join company, contact, activity and offer data for a case.

Example tool arguments:

```json
{"case_id":"CASE-001","sender":{"name":"Bassem","company":"Your company","offer":"Your approved service description"}}
```

The result contains `template`, `selection`, `data`, `email_status`, `warnings`, and `ai_instructions`. The AI should create a subject and body from that result. Sender details are optional; missing details become explicit review placeholders. No email is sent by this server.

## Simple selection algorithm

Count one point for each available category:
company name, recipient name, role, industry, location, company size, technologies, business keywords, pain point, recent signal, recommended offer, and relationship/activity context.

| Available categories | Template |
| --- | --- |
| 0–2 | Minimal introduction |
| 3–5 | Company and role introduction |
| 6–8 | Problem-focused outreach |
| 9–12 | Highly informed outreach |

Repeated values in different tables count once. IDs, URLs, email addresses, approval fields, scores and tracking notes do not raise the score. Blank and common unknown markers do not count; numeric zero is valid. This measures information quantity, not factual reliability or lead quality. Synthetic workbook cases are generally rich, so many choose the detailed template; tests also cover sparse inputs and all boundaries.

Change template descriptions and paste final email bodies into `src/templates.js`. Keep the IDs and thresholds stable or update tests with changes. Generic placeholder bodies are supplied so the prototype can be used immediately. The AI adapts the structure, omits unsupported tokens, and uses at most two useful facts.

## Temporary data

`data/workbook.json` contains every populated record from all eight uploaded sheets, including reference tables. `original_cells` additionally preserves the full cell grid including source formulas and sheet headings; `sheets` holds convenient header-keyed records and cached formula results. Dates are ISO strings. Formatting is not exported.

Only the selected case and its related company, contact, history and exact catalog match are included in its brief. The raw/reference tables remain available in the file. Some recommended offer labels do not exactly match catalog names: these return a warning rather than inventing a match. Later replace this file-backed lookup with a database or scraper adapter.

The workbook's opt-out, verified email, final channel and suppression history determine email eligibility separately from template choice. Every case still returns its selected template and data; ineligible cases instruct the AI to return no email body. Workbook approval status is included for review. Reserved synthetic addresses are not deliverable addresses, even if labeled Verified. Any later sender must validate recipients and approval again.

## Verify and preview

```
npm test
npm run example -- CASE-001
```

Tests cover all 13 score values, all four templates, joins for all 30 cases, unknown IDs, and an actual MCP client connection including tool discovery, authenticated calls and HTTP gates.

## Files

- `src/server.js`: MCP tools and HTTP transport.
- `src/index.js`: port binding and shutdown.
- `src/selection.js`: data joins, score, eligibility and AI instructions.
- `src/templates.js`: editable template descriptions and bodies.
- `src/example.js`: print an example result.
- `data/workbook.json`: temporary complete workbook export.
- `test/server.test.js`: algorithm and protocol tests.
- `render.yaml`: hosting configuration.
- `.env.example`, `.gitignore`, `package.json`, `package-lock.json`: configuration and pinned dependency graph.

Official references: https://ts.sdk.modelcontextprotocol.io/server and https://render.com/docs/deploy-node-express-app
