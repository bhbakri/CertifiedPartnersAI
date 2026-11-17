# Scoring profiles update

Built against CertifiedPartnersAI main commit 201e0a5.

## Install
1. Extract this ZIP.
2. Copy its contents into your existing CertifiedPartnersAI project folder, replacing matching files. Keep all other existing files.
3. Commit and push to the same GitHub repository connected to Render.
4. Allow Render to deploy, then reload /scoring-rules.html.

No new dependencies or environment variables. Keep the existing npm ci build command, npm start command, and email demo credentials.

## Use
Your saved rules are automatically migrated into a profile named Default. Existing lead records are preserved.

Edit targeting rules, then click Save current rules as new profile and give it a name (for example Healthcare or Small businesses). No industry presets are invented: each new profile copies the rules currently displayed.

Select a saved profile and click Activate profile. Activation loads its rules and automatically re-scores open leads, including leads in email review. Completed/rejected records are preserved. Switching does not rewrite existing email drafts or launch a scraper search.

Save changes updates the active profile. As before, use Re-score to apply rule edits to existing open leads. New profile copies remain inactive until activated. Unsaved edits require confirmation before switching. Rename and delete apply to the dropdown selection; an active profile cannot be deleted. Activate another profile first.

Profiles store industry tiers/exclusions, weights, employee/revenue ranges, interest settings, and queue/strong/cooldown thresholds. These are the dashboard's 0–100 company-fit rules, not the email creator's separate 0–12 information-completeness rules.

The active profile is shared across this demo workspace, not private to each user. Saving from a stale page after another user switches profiles is rejected to avoid updating the wrong profile. Reload that page before continuing. Reset sample data resets leads but keeps saved profiles and the active selection.

## Persistence
Profiles use the existing DASHBOARD_STATE_FILE (default .runtime/dashboard.json). Existing records migrate in place; backing up your state file before deployment is sensible. Render's ephemeral filesystem can lose this file on redeploy/restart. Durable profile storage requires a persistent disk with DASHBOARD_STATE_FILE pointing to it, or a future database integration. A code update cannot recover state already lost by Render.

## Validation
All 8 automated tests passed with npm test, including migration, isolated profile rules, validation, activation/re-scoring, history preservation, stale-save rejection, persistence across app restart, rename/delete, and sample reset. DOM interaction checks passed for create, activate, rename, switch back, and delete. JavaScript syntax checks passed. No live Render deployment or visual browser inspection was performed.
