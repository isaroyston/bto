# HDB Payment Planner (No-Build Version)

This is a no-build web app for planning HDB new-flat (BTO) payments.

## What it does

- Lets you key in household, flat, financing, and date assumptions.
- Calculates estimated payable items by stage:
  - Application
  - Flat Booking
  - Sign Agreement for Lease
  - Key Collection
- Generates estimated payment dates using default milestone offsets when exact dates are unknown.
- Shows source links for policy references (HDB, IRAS, CPF).
- Exports schedule items as an .ics calendar file.

## Run locally (no Node/npm needed)

1. Open [index.html](index.html) in your browser.
2. Fill in your details and click "Calculate Plan".
3. Click "Export .ics Reminder File" to download calendar entries.

## Important assumptions

- This tool is for planning/budgeting.
- Final amounts and due dates are subject to official notices and appointment letters.
- HPS premium is displayed as "Depends" because it requires member-specific inputs in CPF's calculator.

## Policy maintenance

Policy values and source URLs are in [app.js](app.js) under the `POLICY` object.

Update these sections when policies change:
- `POLICY.lastVerified`
- `POLICY.fees`
- `POLICY.downpaymentRules`
- `POLICY.sources`

After updating, reload [index.html](index.html) and test one known scenario.

## Current baseline (as configured)

- Last verified: 2026-04-24
- Country: Singapore

## Next step when ready for scale

When Node/npm is available, migrate this logic to a React + TypeScript structure while reusing the same policy and calculator behavior.
