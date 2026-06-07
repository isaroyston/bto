import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const BTO_URL = new URL("../../frontend/public/data/bto/projects.json", import.meta.url);
const BTO_PATH = fileURLToPath(BTO_URL);

async function main() {
  const payload = JSON.parse(await readFile(BTO_PATH, "utf8"));
  const projects = payload.projects ?? [];
  const latestPriced = projects.filter(
    (project) =>
      project.launchMonth === "Oct 2026" &&
      project.flatVariants?.some((variant) => variant.type === "4-room")
  );

  assert(latestPriced.length >= 2, "Need at least two priced Oct 2026 projects.");

  const [projectA, projectB] = latestPriced;
  const lowPrice = {
    ...projectA,
    flatVariants: projectA.flatVariants.map((variant) =>
      variant.type === "4-room" ? { ...variant, basePrice: 300000 } : variant
    ),
  };
  const highPrice = {
    ...projectA,
    flatVariants: projectA.flatVariants.map((variant) =>
      variant.type === "4-room" ? { ...variant, basePrice: 900000 } : variant
    ),
  };
  const nearMrt = { ...projectB, nearestMrtDistanceMeters: 200 };
  const farMrt = { ...projectB, nearestMrtDistanceMeters: 1800 };
  const centralProject =
    projects.find((project) => /caldecott|bishan|telok blangah/i.test(project.nearestMrt ?? "")) ??
    latestPriced.find((project) => /bishan|bukit merah|toa payoh/i.test(project.location ?? ""));
  const outerProject =
    latestPriced.find((project) => /woodlands|yishun|sembawang/i.test(project.location ?? "")) ??
    projects.find((project) => /woodlands|yishun|sembawang/i.test(project.location ?? ""));

  assert(
    affordabilityScore(lowPrice, [lowPrice, highPrice]) >
      affordabilityScore(highPrice, [lowPrice, highPrice]),
    "Lower price should improve affordability."
  );
  assert(
    commuteScore(nearMrt, [nearMrt, farMrt]) > commuteScore(farMrt, [nearMrt, farMrt]),
    "Shorter MRT distance should improve commute score."
  );
  assert(
    centralProject &&
      outerProject &&
      centralityScore(centralProject) > centralityScore(outerProject),
    "Central MRT or city-fringe context should score above far-north/far-west context."
  );

  const buyerLowIncome = buyerFitScore(projectA, latestPriced, 250000, 0);
  const buyerHighIncome = buyerFitScore(projectA, latestPriced, 900000, 120000);
  const qualityLowIncome = projectQualityScore(projectA, latestPriced);
  const qualityHighIncome = projectQualityScore(projectA, latestPriced);

  assert(
    buyerHighIncome > buyerLowIncome,
    "Buyer Fit should change when loan + grant context improves."
  );
  assert(
    qualityLowIncome === qualityHighIncome,
    "Project Quality should not depend on income context."
  );

  const withoutRatings = { ...projectA, btohq: undefined };
  assert(
    Number.isFinite(projectQualityScore(withoutRatings, latestPriced)),
    "Missing ratings should not collapse the total score."
  );
  const withoutCentrality = { ...projectA, locationSignals: undefined };
  assert(
    Number.isFinite(projectQualityScore(withoutCentrality, latestPriced)),
    "Missing centrality should not collapse the total score."
  );

  console.log("BTO scoring checks passed.");
}

function buyerFitScore(project, cohort, loanAmount, ehgGrant) {
  return weightedScore([
    [budgetFitScore(project, loanAmount + ehgGrant), 30],
    [commuteScore(project, cohort), 18],
    [centralityScore(project), 17],
    [waitScore(project, cohort), 15],
    [supplyScore(project, cohort), 10],
    [ratingScore(project), 10],
  ]);
}

function projectQualityScore(project, cohort) {
  return weightedScore([
    [affordabilityScore(project, cohort), 30],
    [commuteScore(project, cohort), 18],
    [centralityScore(project), 17],
    [waitScore(project, cohort), 15],
    [supplyScore(project, cohort), 10],
    [ratingScore(project), 10],
  ]);
}

function affordabilityScore(project, cohort) {
  const price = selectedPrice(project);
  if (!Number.isFinite(price)) return null;
  return lowIsBetter(price, cohort.map(selectedPrice).filter(Number.isFinite));
}

function budgetFitScore(project, budget) {
  const price = selectedPrice(project);
  if (!Number.isFinite(price) || budget <= 0) return null;

  const ratio = price / budget;
  return ratio <= 1
    ? 100 - Math.min(20, (1 - ratio) * 30)
    : Math.max(0, 88 - (ratio - 1) * 180);
}

function commuteScore(project, cohort) {
  if (!Number.isFinite(project.nearestMrtDistanceMeters)) return null;
  return lowIsBetter(
    project.nearestMrtDistanceMeters,
    cohort.map((candidate) => candidate.nearestMrtDistanceMeters).filter(Number.isFinite)
  );
}

function centralityScore(project) {
  return Number.isFinite(project.locationSignals?.centralityScore)
    ? project.locationSignals.centralityScore
    : null;
}

function waitScore(project, cohort) {
  const value = monthSortValue(project.expectedTop);
  if (!value) return null;
  return lowIsBetter(
    value,
    cohort.map((candidate) => monthSortValue(candidate.expectedTop)).filter(Boolean)
  );
}

function supplyScore(project, cohort) {
  if (!Number.isFinite(project.totalUnits)) return null;
  return highIsBetter(
    project.totalUnits,
    cohort.map((candidate) => candidate.totalUnits).filter(Number.isFinite)
  );
}

function ratingScore(project) {
  const ratings = project.btohq?.ratings;
  const values = [ratings?.accessibility, ratings?.amenities, ratings?.affordability]
    .filter(Number.isFinite)
    .map((rating) => (rating / 5) * 100);

  return values.length ? average(values) : null;
}

function selectedPrice(project) {
  return project.flatVariants?.find((variant) => variant.type === "4-room")?.basePrice;
}

function weightedScore(entries) {
  const valid = entries.filter(([score]) => Number.isFinite(score));
  const weight = valid.reduce((sum, entry) => sum + entry[1], 0);
  return Math.round(valid.reduce((sum, entry) => sum + entry[0] * entry[1], 0) / weight);
}

function lowIsBetter(value, values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return 80;
  return Math.round(100 - ((value - min) / (max - min)) * 70);
}

function highIsBetter(value, values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return 80;
  return Math.round(30 + ((value - min) / (max - min)) * 70);
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function monthSortValue(value) {
  const match = String(value ?? "").match(/([A-Za-z]+)\s+((?:19|20)\d{2})/);
  if (!match) return 0;
  const month = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    sept: 8,
    oct: 9,
    nov: 10,
    dec: 11,
  }[match[1].slice(0, 3).toLowerCase()];

  return Number(match[2]) * 12 + month;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
