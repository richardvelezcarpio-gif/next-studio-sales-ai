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
