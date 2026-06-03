# Agent Notes

This repo is split into `frontend` for the Vite React app and `backend` for data
refresh scripts and local policy source documents.

## Key Paths

- `frontend/src/policies/policyConfig.ts`: Singapore CPF, grant, fee, and BTO
  data types.
- `frontend/src/policies/btoDatasource.ts`: BTO data loader. It uses the
  generated RecordBTO JSON only.
- `frontend/public/data/recordbto/projects.json`: generated RecordBTO backfill.
  Do not hand-edit this file; regenerate it.
- `backend/scripts/backfill-recordbto.mjs`: one-time and ongoing RecordBTO
  refresh script.
- `frontend/src/components/BtoTab.tsx`: BTO Radar UI.
- `frontend/src/utils/bto.ts`: BTO filtering, sorting, and year helpers.
- `backend/data/policies/`: local PDF source documents referenced by policy
  metadata.

## Common Commands

Run from the repo root:

```bash
npm.cmd run data:recordbto
npm.cmd run lint
npm.cmd run build
```

Use `npm.cmd` on Windows PowerShell because `npm.ps1` may be blocked by the
execution policy.

## Data Refresh

`npm.cmd run data:recordbto` replaces
`frontend/public/data/recordbto/projects.json` with a fresh scrape from
`https://recordbto.com/bto`. The script uses the project count reported by the
site, is dependency-free, rate-limited, and parses project detail pages plus
listing-level price ranges.

If outbound network is sandboxed, request escalation for this exact command.

## Guardrails

- Keep generated data separate from policy constants.
- Do not reintroduce the old HDB price-range CSV as a BTO source; RecordBTO is
  the replacement dataset.
- Do not overwrite unrelated user changes; `frontend/package-lock.json` may
  already be modified.
- After changing TypeScript or generated data shape, run `npm.cmd run build`.
