import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const BTO_URL = new URL("../../frontend/public/data/bto/projects.json", import.meta.url);
const BTO_PATH = fileURLToPath(BTO_URL);

async function main() {
  const payload = JSON.parse(await readFile(BTO_PATH, "utf8"));
  const projects = payload.projects ?? [];
  const errors = [];

  if (!Array.isArray(projects) || projects.length === 0) {
    errors.push("BTO dataset is missing a non-empty projects array.");
  }

  for (const project of projects) {
    if (!project.id) errors.push("Project is missing id.");
    if (!project.name) errors.push(`${project.id ?? "unknown"} is missing name.`);
    if (!Array.isArray(project.flatVariants)) {
      errors.push(`${project.id ?? "unknown"} flatVariants is not an array.`);
      continue;
    }

    for (const variant of project.flatVariants) {
      if (!Number.isFinite(variant.basePrice)) {
        errors.push(`${project.id} ${variant.type} has invalid basePrice.`);
      }

      if (
        Number.isFinite(variant.floorAreaSqm) &&
        variant.floorAreaSqm > 0 &&
        !Number.isFinite(variant.pricePerSqm)
      ) {
        errors.push(`${project.id} ${variant.type} is missing pricePerSqm.`);
      }
    }

    if (
      project.nearestMrtDistanceMeters !== undefined &&
      (!Number.isFinite(project.nearestMrtDistanceMeters) ||
        project.nearestMrtDistanceMeters < 0 ||
        !project.nearestMrtDistanceSource)
    ) {
      errors.push(`${project.id} has an invalid MRT distance estimate.`);
    }

    if (project.locationSignals) {
      const score = project.locationSignals.centralityScore;
      if (
        score !== undefined &&
        (!Number.isFinite(score) || score < 0 || score > 100)
      ) {
        errors.push(`${project.id} has an invalid centrality score.`);
      }

      if (score !== undefined && !project.locationSignals.source) {
        errors.push(`${project.id} has centrality score without a source.`);
      }
    }
  }

  if (errors.length) {
    throw new Error(errors.slice(0, 20).join("\n"));
  }

  const pricedProjectCount = projects.filter((project) => project.flatVariants.length).length;
  const distanceCount = projects.filter((project) =>
    Number.isFinite(project.nearestMrtDistanceMeters)
  ).length;
  const centralityCount = projects.filter((project) =>
    Number.isFinite(project.locationSignals?.centralityScore)
  ).length;
  const btohqOnlyCount = projects.filter((project) => project.dataSource === "btohq").length;

  console.log(
    `Checked ${projects.length} projects: ${pricedProjectCount} with prices, ${distanceCount} with MRT distance estimates, ${centralityCount} with centrality, ${btohqOnlyCount} BTOHQ-only.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
