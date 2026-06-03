# HDB Planner

React + TypeScript planner for Singapore HDB new-flat planning.

- Estimated loan eligibility from household income.
- Enhanced CPF Housing Grant lookup for first-timer families.
- Downpayment, option fee, survey fee, and fire insurance scenarios.
- Average payment timeline estimates from application through key collection.
- Flat-size-specific BTO comparisons from the generated RecordBTO backfill.

## Structure

- [`frontend`](frontend): Vite React app.
- [`backend`](backend): data refresh scripts and local policy source documents.

## Run Locally

```bash
npm install --prefix frontend
npm.cmd run dev
```

## Check The App

```bash
npm.cmd run lint
npm.cmd run build
```

## Refresh BTO Data

```bash
npm.cmd run data:recordbto
```

This replaces `frontend/public/data/recordbto/projects.json` with the current
RecordBTO project scrape. The scraper is dependency-free and uses the project
count reported by `https://recordbto.com/bto`.

## Deploy

The root [`vercel.json`](vercel.json) is configured for a repository where the
Vite app is inside `frontend`.

## Policy Maintenance

Policy constants are centralized in
[`frontend/src/policies/policyConfig.ts`](frontend/src/policies/policyConfig.ts).

When updating policy values:

1. Review the listed official source pages and local PDFs.
2. Update the relevant constants.
3. Set `lastVerified` to the review date.
4. Run `npm.cmd run lint` and `npm.cmd run build`.
