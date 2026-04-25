# HDB Payment Planner (React + TypeScript)

This folder contains the Node/npm port of the no-build planner in the workspace root.

## Features

- Interactive form for HDB planning inputs.
- Policy-backed calculations for fees and downpayment splits.
- Age-based CPF defaults (employee, employer, OA allocation) with optional manual overrides.
- Optional savings snapshot section focused on current cash and CPF OA balance.
- Estimated milestone timeline and payment schedule table.
- Source links for HDB, IRAS, and CPF references.
- Calendar export in ICS format.

## Prerequisites

- Node.js LTS (npm included).

Installed in this environment:

- Node: v24.15.0
- npm: 11.12.1

## Run locally

1. Open terminal in this folder.
2. Install dependencies:

   npm install

3. Start development server:

   npm run dev

4. Open the local URL shown by Vite.

## Build

Run production build:

npm run build

## Deploy (Quickest, no Git required)

If you just want a public URL quickly for testing:

1. Build locally:

   npm run build

2. Open Netlify Drop: https://app.netlify.com/drop
3. Drag the `dist` folder onto the page.
4. Share the generated Netlify URL.

## Deploy with GitHub + Vercel (Recommended)

This is best for ongoing updates because every push redeploys automatically.

### 1) Put project on GitHub

If your local folder is not yet a Git repository, run these in the workspace root:

git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main

### 2) Import into Vercel

1. Go to https://vercel.com/new
2. Import your GitHub repository.
3. If your repo root is this `react-app` folder, Vercel usually auto-detects settings.
4. If your repo root is the parent folder, set:
   - Root Directory: `react-app`
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Click Deploy.

### 3) Share URL

Use the generated `*.vercel.app` URL. You can add a custom domain later in Vercel project settings.

## Deploy with GitHub + Netlify (Alternative)

1. Create a new site from Git in Netlify.
2. Connect your GitHub repo.
3. Use these settings:
   - Base directory: `react-app` (only if your repo root is the parent folder)
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Deploy site.

This project includes `netlify.toml` and `vercel.json` for SPA-friendly hosting defaults.

## Policy maintenance

All policy values are centralized in [src/policies/policyConfig.ts](src/policies/policyConfig.ts).

Update workflow:

1. Review official source pages listed in `sources`.
2. Update policy constants and rates in `POLICY_CONFIG`.
3. Set `lastVerified` to the review date.
4. Adjust `updateCadenceDays` if your review schedule changes.
5. For CPF defaults, update:
   - `cpfContributionByAgeBand`
   - `cpfAllocationByAgeBand`
6. Run build and validate one known scenario.

Validation commands:

- `npm run build`
- `npm run dev` (quick browser smoke test)
