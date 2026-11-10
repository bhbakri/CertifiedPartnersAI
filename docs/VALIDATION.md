# Validation

- `npm ci`: successful using the existing lockfile.
- `npm test`: all four suites passed, including original template boundaries, workbook joins and real MCP client initialize/discovery/calls/auth gates.
- Added dashboard integration test: rule validation, saved changes, re-scoring, verified-contact gate, lead-before-email gate, placeholder rejection, persistence across app restart, unknown-lead handling.
- DOM integration checks against the running Express server: review queue, lead and email pages, Tanner editor save/reload, keyboard weight adjustment, confirmation and real re-scoring, scraper placeholder and queue tabs. No uncaught script errors.
- A full Chromium visual check could not run in the execution environment (browser process socket restriction). DOM checks do not replace screenshot/layout inspection. Original upstream styling was retained.
- Live deployment, Apollo, real scraping, AI generation and email delivery were not tested or activated.
