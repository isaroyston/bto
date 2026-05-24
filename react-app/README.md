# HDB Planner React App

Vite + React + TypeScript app for HDB affordability, grants, payment timelines,
and BTO price range exploration.

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm run preview
```

## Data

- `public/data/hdb/price-range-hdb-flats-offered.csv` powers the BTO Radar.
- `public/data/hdb/ura/planning-area-boundary.geojson` powers the price map.
- If the CSV cannot be loaded, the app falls back to a small sample dataset in
  `src/policies/btoDatasource.ts`.

## Source Of Truth

- Policy values: `src/policies/policyConfig.ts`
- BTO data loading: `src/policies/btoDatasource.ts`
- App composition: `src/App.tsx`
- Dashboard sections: `src/components/`

Run `npm run lint` and `npm run build` after policy, data, or UI changes.
