# Bare-bones email demo

Open `/email-demo` on your existing Render website after deploying this update. The sidebar has an Email demo link.

This page uses the original 30-case workbook, `buildBrief`, 0–12 information scoring, four templates, eligibility rules, and AI instructions. It is independent of the dashboard's 0–100 ICP fit score. The website now can call an AI provider to write a real draft; it does not send emails. MCP behavior is unchanged.

## Install

Copy the files from CertifiedPartnersAI_EmailDemo_Update.zip into your existing project root, replacing matching files. Commit and push to the same GitHub branch Render deploys. This patch is based on GitHub main commit 1d535db; merge src/server.js and public/js/app.js if you have made newer local changes to them.

Keep Render's existing build command `npm ci` and start command `npm start`. Keep ENABLE_PREVIEW unset or true.

## Enable the Generate button

In the existing Render service's Environment settings add:

- `OPENAI_API_KEY`: your OpenAI API key (server only; never paste it into the demo page or commit it).
- `EMAIL_DEMO_KEY`: a private password you choose for the demo. Enter that password in the page. This prevents anonymous visitors from using your paid generation endpoint.
- Optional `EMAIL_MODEL`: defaults to `gpt-4o-mini`; use a model your API account can access that supports Chat Completions with JSON-schema structured outputs.

Save and redeploy. API generation uses API billing, not the ChatGPT MCP connection. No key is included in the package.

Without these settings you can still inspect templates/data and click Copy prompt for ChatGPT. Paste that into your existing ChatGPT session to draft manually.

## Demo steps

1. Choose an eligible company/case.
2. Enter your name, company and approved offer description. Missing sender details remain explicit placeholders.
3. Review its template, information score and source data.
4. Enter the demo password and click Generate email with AI.
5. Review the subject, body, warnings and remaining placeholders; copy the email if needed.

Ineligible cases are visible but blocked from generation, including direct API requests. Generation shows measured elapsed time for this request; it is not a benchmark average. Drafts are not saved or delivered. Refreshing the page clears them.

The template distribution follows the current workbook. This update does not fabricate company data or force an equal number of cases into each tier.

## Endpoints

- GET `/api/email-demo/cases` — case summaries and availability, never keys.
- POST `/api/email-demo/brief` — `{case_id, sender:{name,company,offer}}`.
- POST `/api/email-demo/generate` — same body, plus `X-Demo-Key` header.

Limited to 10 generation attempts per minute and 2 simultaneous requests per server process, with a 60-second provider timeout. This is a shared demo password, not production user authentication.

## Verification

Automated tests cover real scoring and eligibility, password checks, missing configuration, provider error handling and structured response validation using a stubbed provider. No paid live AI call was made because no API key was supplied. Existing MCP tests are retained. Human review remains necessary; structured output validation does not guarantee factual accuracy.
