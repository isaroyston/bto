# HDB Payment Planner (React + TypeScript)

This repository is a React + TypeScript planner for HDB new-flat (BTO) payments.

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

## Project location

The app lives in the [react-app](react-app) folder.

## Run locally

1. Open a terminal in [react-app](react-app).
2. Install dependencies:

  npm install

3. Start development server:

  npm run dev

## Build

From [react-app](react-app):

npm run build

## Deploy (Vercel)

If the repo root is connected to Vercel, ensure the Root Directory is set to `react-app`.

## Policy maintenance

All policy values are centralized in [react-app/src/policies/policyConfig.ts](react-app/src/policies/policyConfig.ts).

Update workflow:

1. Review official source pages listed in `sources`.
2. Update policy constants and rates in `POLICY_CONFIG`.
3. Set `lastVerified` to the review date.
4. Adjust `updateCadenceDays` if your review schedule changes.
5. For CPF defaults, update:
  - `cpfContributionByAgeBand`
  - `cpfAllocationByAgeBand`
6. Run build and validate one known scenario.
