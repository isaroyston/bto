import type { BtoProject } from "./policyConfig";

const BTO_PROJECTS_JSON = "/data/bto/projects.json";
const CACHE_DURATION = 60 * 60 * 1000;

type BtoPayload = {
  generatedAt?: string;
  projectCount?: number;
  projects?: BtoProject[];
};

let cachedProjects: BtoProject[] | null = null;
let cacheTime = 0;

export async function fetchBtoProjects(): Promise<BtoProject[]> {
  return fetchFromBtoJson();
}

export async function getBtoProjectsCached(): Promise<BtoProject[]> {
  const now = Date.now();
  const hasInvalidPrice = cachedProjects?.some((project) =>
    project.flatVariants.some((variant) => !Number.isFinite(variant.basePrice))
  );

  if (cachedProjects && !hasInvalidPrice && now - cacheTime < CACHE_DURATION) {
    return cachedProjects;
  }

  cachedProjects = await fetchBtoProjects();
  cacheTime = now;
  return cachedProjects;
}

async function fetchFromBtoJson(): Promise<BtoProject[]> {
  const response = await fetch(BTO_PROJECTS_JSON);
  if (!response.ok) {
    throw new Error(`Unable to load BTO dataset: ${response.status}`);
  }

  const payload = (await response.json()) as BtoPayload;
  if (!Array.isArray(payload.projects)) {
    throw new Error("BTO dataset is missing the projects array.");
  }

  const projects = payload.projects.filter(isValidBtoProject);
  if (projects.length === 0) {
    throw new Error("BTO dataset did not contain any valid projects.");
  }

  return projects;
}

function isValidBtoProject(project: BtoProject): project is BtoProject {
  return Boolean(
    project &&
      typeof project.id === "string" &&
      typeof project.name === "string" &&
      typeof project.launchMonth === "string" &&
      typeof project.location === "string" &&
      Array.isArray(project.flatVariants)
  );
}
