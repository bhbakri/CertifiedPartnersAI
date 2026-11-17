# OpenRouter email demo update

Copy the ZIP contents into your existing CertifiedPartnersAI project, replacing matching files. Keep all other files. Commit/push to the existing GitHub repository and let Render deploy. This patch only changes the email demo, so it works alongside the scoring-profiles update. No dependencies or build commands change.

## Render environment
- OPENROUTER_API_KEY: your OpenRouter secret API key (server only).
- EMAIL_DEMO_KEY: keep your existing demo password.
- OPENAI_API_KEY: optional; keep it to also offer direct OpenAI generation.
- OPENROUTER_MODEL: optional default model ID; defaults to openai/gpt-4o-mini. If absent from the available list, the UI selects the first available model.
- OPENROUTER_MODELS: optional comma-separated model IDs to limit the dropdown, e.g. openai/gpt-4o-mini. Without it, all compatible catalog models are offered.
- EMAIL_MODEL: continues to control the direct OpenAI model.

Save environment changes and redeploy. Open /email-demo, select OpenRouter, choose a model, select a company, and enter the demo password. Click Generate email with AI. Nothing is sent. Your OpenRouter API key never goes into the page or the demo-password box.

OpenRouter becomes the default provider when its key is configured. If both keys are configured, the provider dropdown offers both services. Billing follows the selected provider; selecting OpenRouter does not use your direct OpenAI key.

## Model selection
The server reads https://openrouter.ai/api/v1/models and caches it for five minutes. The dropdown includes text-output models advertising structured_outputs, filtered to Chat Completions when endpoint metadata is supplied, and to OPENROUTER_MODELS when configured. Reload models retries loading the server catalog; it does not bypass its five-minute cache.

Generation uses https://openrouter.ai/api/v1/chat/completions with JSON schema output and provider.require_parameters=true. A model appearing in the catalog does not guarantee availability for your account, credits, privacy preferences, or a particular provider at request time. Errors are shown without exposing upstream details or keys. Different models may cost different amounts; this page does not quote prices.

The chosen model is validated server-side. Catalog failures block OpenRouter generation instead of silently choosing a different provider. Existing eligibility checks, password protection, output validation, 60-second generation timeout, and demo generation limits remain. Generation results report the provider and returned model.

## Validation
All 10 automated tests passed, including mocked OpenRouter catalog filtering/caching, provider credentials and URL routing, selected model validation, unavailable provider/catalog errors, and existing OpenAI and scoring-profile regression tests. Frontend JavaScript syntax check passed. No paid live OpenRouter request or browser visual test was performed; verify one draft after adding your key in Render.

References:
https://openrouter.ai/docs/guides/features/structured-outputs
https://openrouter.ai/docs/api/api-reference/models/get-models
