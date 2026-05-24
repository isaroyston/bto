# HDB Planner

React + TypeScript planner for Singapore HDB new-flat planning. The app lives in
[`react-app`](react-app) and focuses on:

- Estimated loan eligibility from household income.
- Enhanced CPF Housing Grant lookup for first-timer families.
- Downpayment, option fee, survey fee, and fire insurance scenarios.
- Payment timeline estimates from application through key collection.
- BTO price range comparisons from the bundled HDB CSV.
- Planning-area price intensity map from local GeoJSON.

## Run Locally

```bash
cd react-app
npm install
npm run dev
```

## Check The App

```bash
cd react-app
npm run lint
npm run build
```

## Deploy

The root [`vercel.json`](vercel.json) is configured for a repository where the
Vite app is inside `react-app`.

## Policy Maintenance

Policy constants are centralized in
[`react-app/src/policies/policyConfig.ts`](react-app/src/policies/policyConfig.ts).

When updating policy values:

1. Review the listed official source pages and local PDFs.
2. Update the relevant constants.
3. Set `lastVerified` to the review date.
4. Run `npm run lint` and `npm run build` from `react-app`.
