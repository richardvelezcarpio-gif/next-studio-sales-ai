# Next Studio Sales AI

Internal, local-first sales workspace for converting conversations into customers.

## Run locally

```bash
npm install
npm run dev
```

## Phase 1 capabilities

- English and Spanish UI, with remembered interface language.
- Leads, lead detail, Kanban pipeline, follow-ups, notes, activities, templates, and sales settings.
- Individual preferred lead language controls which English or Spanish sales template is used in the playbook.
- Local-first persistence through `src/services/storage.ts`; no APIs, backend, scraping, bots, or automated messages.
- Import/export backup, reset confirmation, and optional clearly marked fictional demo data.

## Architecture

- `src/i18n.ts` contains the centralized UI labels plus stage, source, and service display translations.
- `src/services/storage.ts` is the only persistence adapter and can be replaced by a remote data adapter later.
- `src/types.ts` holds stable internal IDs and the Phase 1 data model.

## Verification

`npm run build` completes successfully.

## OpenAI (Phase 3)

The browser never receives an API key. For a Vercel deployment, set `OPENAI_API_KEY` in the server environment. The serverless endpoint at `api/ai.ts` uses the Responses API and returns a safe local-fallback status whenever the key is absent, the request times out, or the response is invalid. Copy `.env.example` only for local server configuration; never commit a real `.env` file.

## Supabase (Phase 5)

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the deployment environment, then apply the ordered SQL files in `supabase/migrations/`. The anon key is used only with Row Level Security enabled; no service-role key, OAuth token, or secret is stored in the browser or local storage. Without Supabase configuration the secure sign-in screen reports configuration status and does not pretend cloud data is available.
