import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RECORDBTO_URL = new URL("../../frontend/public/data/recordbto/projects.json", import.meta.url);
const BTOHQ_URL = new URL("../../frontend/public/data/btohq/projects.json", import.meta.url);
const OUTPUT_URL = new URL("../../frontend/public/data/bto/projects.json", import.meta.url);

const RECORDBTO_PATH = fileURLToPath(RECORDBTO_URL);
const BTOHQ_PATH = fileURLToPath(BTOHQ_URL);
const OUTPUT_PATH = fileURLToPath(OUTPUT_URL);
const FLAT_TYPE_ORDER = ["2-room", "3-room", "4-room", "5-room", "executive"];

async function main() {
  const recordbtoPayload = JSON.parse(await readFile(RECORDBTO_PATH, "utf8"));
  const btohqPayload = JSON.parse(await readFile(BTOHQ_PATH, "utf8"));
  const recordProjects = recordbtoPayload.projects ?? [];
  const btohqProjects = btohqPayload.projects ?? [];
  const btohqByKey = new Map();
  const usedBtohqIds = new Set();
  const projects = [];
  let matchedProjectCount = 0;

  for (const project of btohqProjects) {
    btohqByKey.set(projectKey(project.launchMonth, project.displayName), project);
  }

  for (const recordProject of recordProjects) {
    const key = projectKey(recordProject.launchMonth, recordProject.name);
    const btohqProject = btohqByKey.get(key);

    if (btohqProject) {
      matchedProjectCount += 1;
      usedBtohqIds.add(btohqProject.id);
      projects.push(mergeProject(recordProject, btohqProject));
    } else {
      projects.push(recordProject);
    }
  }

  const btohqOnlyProjects = btohqProjects
    .filter((project) => !usedBtohqIds.has(project.id))
    .map(fromBtohqProject);

  projects.push(...btohqOnlyProjects);
  projects.sort(compareProjects);

  const payload = {
    generatedAt: new Date().toISOString(),
    source: "merged",
    sources: {
      recordbto: {
        source: recordbtoPayload.source,
        generatedAt: recordbtoPayload.generatedAt,
        projectCount: recordProjects.length,
      },
      btohq: {
        source: btohqPayload.source,
        generatedAt: btohqPayload.generatedAt,
        launchCount: btohqPayload.launchCount,
        projectCount: btohqProjects.length,
      },
    },
    mergeSummary: {
      projectCount: projects.length,
      matchedProjectCount,
      recordbtoOnlyProjectCount: recordProjects.length - matchedProjectCount,
      btohqOnlyProjectCount: btohqOnlyProjects.length,
      btohqOnlyLaunches: diffLaunches(btohqProjects, recordProjects),
      recordbtoOnlyLaunches: diffLaunches(recordProjects, btohqProjects),
      pricePolicy: "RecordBTO remains the only price source. BTOHQ-only projects are included without flat price variants.",
    },
    projects: projects.map(compactObject),
  };

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  console.log(`Wrote ${projects.length} merged BTO projects to ${OUTPUT_PATH}`);
  console.log(
    `Matched ${matchedProjectCount}; added ${btohqOnlyProjects.length} BTOHQ-only; kept ${
      recordProjects.length - matchedProjectCount
    } RecordBTO-only.`
  );
}

function mergeProject(recordProject, btohqProject) {
  const flatTypesFromRecord = (recordProject.flatVariants ?? []).map((variant) => variant.type);
  const availableFlatTypes = unionFlatTypes(flatTypesFromRecord, btohqProject.availableFlatTypes);

  return {
    ...recordProject,
    dataSource: "recordbto+btohq",
    btoType: recordProject.btoType ?? btohqProject.classification,
    expectedTop: recordProject.expectedTop ?? btohqProject.estimatedTop,
    totalUnits: recordProject.totalUnits ?? btohqProject.totalUnits,
    address: chooseDetailedString(recordProject.address, btohqProject.address),
    unitTypes: btohqProject.unitTypesText,
    availableFlatTypes,
    btohq: toBtohqMeta(btohqProject),
  };
}

function fromBtohqProject(project) {
  return {
    id: `btohq-${project.id}`,
    launchMonth: project.launchMonth,
    name: project.displayName,
    location: project.location,
    district: project.district,
    suggestedFinancing: "hdb",
    suggestedScheme: "normal",
    dataSource: "btohq",
    schemeSource: "btohq",
    flatVariants: [],
    unitTypes: project.unitTypesText,
    availableFlatTypes: project.availableFlatTypes,
    status: decodeStatus(project.status),
    address: project.address,
    btoType: project.classification,
    expectedTop: project.estimatedTop,
    totalUnits: project.totalUnits,
    sourceUrl: project.sourceUrl,
    btohq: toBtohqMeta(project),
  };
}

function toBtohqMeta(project) {
  return {
    projectSpecId: project.projectSpecId,
    salesLaunchId: project.salesLaunchId,
    launchName: project.launchName,
    launchSourceUrl: project.launchSourceUrl,
    classification: project.classification,
    btohqTypeCode: project.btohqTypeCode,
    isPLH: project.isPLH,
    noOfBlocks: project.noOfBlocks,
    highestFloor: project.highestFloor,
    tenure: project.tenure,
    developer: project.developer,
    unitTypesText: project.unitTypesText,
    availableFlatTypes: project.availableFlatTypes,
    unitSupply: project.unitSupply,
    ratings: project.ratings,
    nearbyAmenities: project.nearbyAmenities,
    media: project.media,
    construction: project.construction,
    metaDescription: project.metaDescription,
    descriptionText: project.descriptionText,
    sourceUrl: project.sourceUrl,
  };
}

function projectKey(launchMonth, projectName) {
  return `${monthKey(launchMonth)}|${normalizeName(projectName)}`;
}

function normalizeName(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/\bbto\b/g, "")
    .replace(/\bname\s+tbc\b/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function monthKey(value) {
  const match = String(value ?? "").match(/([A-Za-z]+)\s+((?:19|20)\d{2})/);
  if (!match) return "0000-00";

  return `${match[2]}-${String(monthNumber(match[1])).padStart(2, "0")}`;
}

function monthNumber(value) {
  const month = String(value ?? "").slice(0, 3).toLowerCase();
  return {
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    may: 5,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    oct: 10,
    nov: 11,
    dec: 12,
  }[month] ?? 0;
}

function unionFlatTypes(...groups) {
  const types = new Set();

  for (const group of groups) {
    for (const type of group ?? []) {
      if (FLAT_TYPE_ORDER.includes(type)) types.add(type);
    }
  }

  return Array.from(types).sort(
    (a, b) => FLAT_TYPE_ORDER.indexOf(a) - FLAT_TYPE_ORDER.indexOf(b)
  );
}

function chooseDetailedString(current, candidate) {
  if (!candidate) return current;
  if (!current) return candidate;
  if (/\b(tbc|estimated|exact site)\b/i.test(current)) return candidate;
  return current;
}

function decodeStatus(value) {
  return (
    {
      A: "active",
      I: "inactive",
    }[value] ?? value
  );
}

function diffLaunches(sourceProjects, comparisonProjects) {
  const comparisonMonths = new Set(comparisonProjects.map((project) => monthKey(project.launchMonth)));
  const launchMonths = new Set();

  for (const project of sourceProjects) {
    const key = monthKey(project.launchMonth);
    if (!comparisonMonths.has(key)) launchMonths.add(project.launchMonth);
  }

  return Array.from(launchMonths).sort((a, b) => monthKey(b).localeCompare(monthKey(a)));
}

function compareProjects(a, b) {
  const dateA = monthKey(a.launchMonth);
  const dateB = monthKey(b.launchMonth);
  if (dateA !== dateB) return dateB.localeCompare(dateA);

  const locationA = (a.location || a.district || "").toLowerCase();
  const locationB = (b.location || b.district || "").toLowerCase();
  if (locationA !== locationB) return locationA.localeCompare(locationB);

  return a.name.localeCompare(b.name);
}

function compactObject(value) {
  if (Array.isArray(value)) return value.map(compactObject);

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => {
          if (entryValue === null || entryValue === undefined) return false;
          return true;
        })
        .map(([key, entryValue]) => [key, compactObject(entryValue)])
    );
  }

  return value;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
