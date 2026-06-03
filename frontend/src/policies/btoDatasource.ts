import type { BtoProject } from "./policyConfig";

const RECORDBTO_PROJECTS_JSON = "/data/recordbto/projects.json";
const CACHE_DURATION = 60 * 60 * 1000;

type RecordBtoPayload = {
  generatedAt?: string;
  projectCount?: number;
  projects?: BtoProject[];
};

let cachedProjects: BtoProject[] | null = null;
let cacheTime = 0;

export async function fetchBtoProjects(): Promise<BtoProject[]> {
  return fetchFromRecordBtoJson();
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

async function fetchFromRecordBtoJson(): Promise<BtoProject[]> {
  const response = await fetch(RECORDBTO_PROJECTS_JSON);
  if (!response.ok) {
    throw new Error(`Unable to load RecordBTO dataset: ${response.status}`);
  }

  const payload = (await response.json()) as RecordBtoPayload;
  if (!Array.isArray(payload.projects)) {
    throw new Error("RecordBTO dataset is missing the projects array.");
  }

  const projects = payload.projects.filter(isValidBtoProject);
  if (projects.length === 0) {
    throw new Error("RecordBTO dataset did not contain any valid projects.");
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
