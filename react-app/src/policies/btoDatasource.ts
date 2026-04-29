import type { BtoProject, BtoFlatVariant } from "./policyConfig";

type BtoFlatType = BtoFlatVariant["type"];

const FALLBACK_LAUNCH_MONTH = "2026-06";
const EXPECTED_JUNE_2026_PROJECT_COUNT = 7;

const JUNE_2026_LOCATION_COUNTS: Record<string, number> = {
  "ang mo kio": 2,
  bishan: 1,
  "bukit merah": 1,
  sembawang: 2,
  woodlands: 1,
};

const FALLBACK_BASE_PRICES: Record<BtoFlatType, number> = {
  "2-room": 320000,
  "3-room": 460000,
  "4-room": 580000,
  "5-room": 700000,
  executive: 780000,
};

const JUNE_2026_FALLBACK_PROJECTS: BtoProject[] = [
  createFallbackProject({
    id: "ang-mo-kio-2026-06-a",
    location: "Ang Mo Kio",
    flatTypes: ["3-room", "4-room"],
  }),
  createFallbackProject({
    id: "ang-mo-kio-2026-06-b",
    location: "Ang Mo Kio",
    flatTypes: ["2-room", "4-room"],
  }),
  createFallbackProject({
    id: "bishan-2026-06",
    location: "Bishan",
    flatTypes: ["2-room", "4-room"],
  }),
  createFallbackProject({
    id: "bukit-merah-2026-06",
    location: "Bukit Merah",
    flatTypes: ["2-room", "3-room", "4-room"],
  }),
  createFallbackProject({
    id: "sembawang-2026-06-a",
    location: "Sembawang",
    flatTypes: ["2-room", "3-room", "4-room", "5-room"],
  }),
  createFallbackProject({
    id: "sembawang-2026-06-b",
    location: "Sembawang",
    flatTypes: ["2-room", "3-room", "4-room", "5-room"],
  }),
  createFallbackProject({
    id: "woodlands-2026-06",
    location: "Woodlands",
    flatTypes: ["2-room", "3-room", "4-room", "5-room"],
  }),
];

function createFallbackProject(options: {
  id: string;
  location: string;
  flatTypes: BtoFlatType[];
  launchMonth?: string;
  suggestedFinancing?: "hdb" | "bank";
  suggestedScheme?: "normal" | "staggered" | "dia";
}): BtoProject {
  const launchMonth = options.launchMonth ?? FALLBACK_LAUNCH_MONTH;
  return {
    id: options.id,
    launchMonth,
    name: options.location,
    location: options.location,
    district: extractDistrict(options.location),
    suggestedFinancing: options.suggestedFinancing ?? "hdb",
    suggestedScheme: options.suggestedScheme ?? "normal",
    flatVariants: sortFlatVariants(options.flatTypes.map(createFallbackVariant)),
  };
}

function createFallbackVariant(type: BtoFlatType): BtoFlatVariant {
  return {
    type,
    basePrice: FALLBACK_BASE_PRICES[type],
    maxEhg: estimateMaxEhg(type),
    suggestedOccupants: estimateOccupants(type),
    suggestedTenureYears: type === "5-room" ? 30 : 25,
  };
}

/**
 * Fetch BTO project data from data.gov.sg HDB dataset
 * This is the official public data source for HDB information
 *
 * Note: The resource_id may need updating - check data.gov.sg/datasets for latest HDB BTO launches
 * Alternative: Can scrape https://www.hdb.gov.sg/bto or use HDB's undocumented API
 */
async function fetchFromDataGovSg(): Promise<BtoProject[] | null> {
  try {
    // Try fetching from data.gov.sg HDB BTO dataset
    // Resource ID should be for HDB BTO project launches
    const response = await fetch(
      "https://data.gov.sg/api/action/datastore_search?" +
        "resource_id=66e148a8-70dd-4eda-8ef8-8d53b18c1e23&limit=100",
    );

    if (!response.ok) {
      console.warn("data.gov.sg API error:", response.status);
      return null;
    }

    const result = await response.json();
    const records = result.result?.records || [];

    if (records.length === 0) {
      console.warn("No BTO records found from data.gov.sg");
      return null;
    }

    // Transform data.gov.sg format to our BtoProject format
    const projects = transformDataGovSgRecords(records);
    return projects.length > 0 ? projects : null;
  } catch (error) {
    console.warn("Failed to fetch from data.gov.sg:", error);
    return null;
  }
}

/**
 * Transform records from data.gov.sg into BtoProject format
 */
function transformDataGovSgRecords(records: Record<string, unknown>[]): BtoProject[] {
  const projects: Record<string, BtoProject> = {};

  for (const record of records) {
    try {
      // Extract fields from data.gov.sg record
      const projectName = String(record["Project Name"] || record["project_name"] || "").trim();
      const location = String(record["Location"] || record["location"] || projectName || "").trim();
      const launchMonth = String(record["Launch Month"] || record["launch_month"] || "");
      const flatTypeRaw = String(record["Flat Type"] || record["flat_type"] || "");
      const basePriceRaw = String(record["Base Price"] || record["base_price"] || "0");

      const flatTypeKey = normalizeFlatType(flatTypeRaw);
      if (!projectName || !flatTypeKey) {
        continue;
      }

      const normalizedLaunchMonth = normalizeDate(launchMonth);
      const projectId = `${slugify(projectName)}-${normalizedLaunchMonth}`;
      const parsedPrice = parseInt(basePriceRaw, 10);
      const basePrice = Number.isFinite(parsedPrice) && parsedPrice > 0
        ? parsedPrice
        : FALLBACK_BASE_PRICES[flatTypeKey];

      // Initialize project if not exists
      if (!projects[projectId]) {
        projects[projectId] = {
          id: projectId,
          launchMonth: normalizedLaunchMonth,
          name: projectName,
          location: location || projectName,
          district: extractDistrict(location || projectName),
          suggestedFinancing: "hdb",
          suggestedScheme: "normal",
          flatVariants: [],
        };
      }

      // Add flat variant
      const variant: BtoFlatVariant = {
        type: flatTypeKey,
        basePrice,
        maxEhg: estimateMaxEhg(flatTypeKey),
        suggestedOccupants: estimateOccupants(flatTypeKey),
        suggestedTenureYears: flatTypeKey === "5-room" ? 30 : 25,
      };

      if (!projects[projectId].flatVariants.some((existing) => existing.type === variant.type)) {
        projects[projectId].flatVariants.push(variant);
      }
    } catch (err) {
      console.warn("Error transforming record:", record, err);
      continue;
    }
  }

  return Object.values(projects)
    .map((project) => ({
      ...project,
      flatVariants: sortFlatVariants(project.flatVariants),
    }))
    .sort((left, right) =>
      left.launchMonth.localeCompare(right.launchMonth) || left.location.localeCompare(right.location),
    );
}

function normalizeFlatType(raw: string): BtoFlatType | null {
  const normalized = raw.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  if (!normalized) {
    return null;
  }

  if (normalized.includes("2") && normalized.includes("flexi")) {
    return "2-room";
  }

  if (normalized.startsWith("2 ") || normalized.startsWith("2")) {
    return "2-room";
  }

  if (normalized.includes("3gen") || normalized.includes("3 gen") || normalized.includes("three gen")) {
    return "5-room";
  }

  if (normalized.startsWith("3 ") || normalized.startsWith("3")) {
    return "3-room";
  }

  if (normalized.startsWith("4 ") || normalized.startsWith("4")) {
    return "4-room";
  }

  if (normalized.startsWith("5 ") || normalized.startsWith("5")) {
    return "5-room";
  }

  if (normalized.includes("executive")) {
    return "executive";
  }

  return null;
}

function sortFlatVariants(variants: BtoFlatVariant[]): BtoFlatVariant[] {
  const order: BtoFlatType[] = ["2-room", "3-room", "4-room", "5-room", "executive"];
  return [...variants].sort((left, right) => order.indexOf(left.type) - order.indexOf(right.type));
}

function applyJune2026Fallback(projects: BtoProject[]): BtoProject[] {
  const juneProjects = projects.filter((project) => project.launchMonth === FALLBACK_LAUNCH_MONTH);

  if (
    juneProjects.length === EXPECTED_JUNE_2026_PROJECT_COUNT &&
    matchesExpectedJuneLocations(juneProjects)
  ) {
    return projects;
  }

  const otherProjects = projects.filter(
    (project) => project.launchMonth !== FALLBACK_LAUNCH_MONTH,
  );

  return [...otherProjects, ...JUNE_2026_FALLBACK_PROJECTS].sort((left, right) =>
    left.launchMonth.localeCompare(right.launchMonth) || left.location.localeCompare(right.location),
  );
}

function matchesExpectedJuneLocations(projects: BtoProject[]): boolean {
  const counts: Record<string, number> = {};

  for (const project of projects) {
    const key = normalizeLocation(project.location);
    counts[key] = (counts[key] ?? 0) + 1;
  }

  return Object.entries(JUNE_2026_LOCATION_COUNTS).every(
    ([location, requiredCount]) => (counts[location] ?? 0) >= requiredCount,
  );
}

function normalizeLocation(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Normalize date formats (handles various inputs like "Jun 2026", "2026-06", etc.)
 */
function normalizeDate(dateStr: string): string {
  try {
    // Try to parse various formats
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      return `${year}-${month}`;
    }

    // Fallback: try to extract YYYY-MM pattern
    const match = dateStr.match(/(\d{4})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}`;

    // Fallback: today's month as default
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  } catch {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Extract district abbreviation from location string
 */
function extractDistrict(location: string): string {
  const districtMap: Record<string, string> = {
    "Ang Mo Kio": "AMK",
    "Bedok": "BD",
    "Bukit Merah": "BM",
    "Bukit Timah": "BT",
    "Clementi": "CL",
    "Geylang": "GL",
    "Hougang": "HG",
    "Jurong East": "JE",
    "Jurong West": "JW",
    "Marine Parade": "MP",
    "Pasir Ris": "PR",
    "Punggol": "PG",
    "Queenstown": "QT",
    "Sembawang": "SB",
    "Sengkang": "SK",
    "Serangoon": "SR",
    "Tampines": "TM",
    "Toa Payoh": "TP",
    "Woodlands": "WD",
    "Yishun": "YS",
  };

  for (const [name, abbr] of Object.entries(districtMap)) {
    if (location.includes(name)) return abbr;
  }

  return location.substring(0, 2).toUpperCase();
}

/**
 * Estimate max EHG grant based on flat type (rough estimates)
 */
function estimateMaxEhg(flatType: string): number {
  const ehgMap: Record<string, number> = {
    "2-room": 50000,
    "3-room": 85000,
    "4-room": 110000,
    "5-room": 130000,
    executive: 140000,
  };
  return ehgMap[flatType] || 85000;
}

/**
 * Estimate household occupants for flat type
 */
function estimateOccupants(flatType: string): number {
  const occupantMap: Record<string, number> = {
    "2-room": 2,
    "3-room": 3,
    "4-room": 4,
    "5-room": 5,
    executive: 5,
  };
  return occupantMap[flatType] || 3;
}

/**
 * Main function: Fetch BTO projects from real sources with fallback
 * Returns: BtoProject[] or null if both sources fail
 */
export async function fetchBtoProjects(): Promise<BtoProject[]> {
  // Try fetching from data.gov.sg first
  const dataGovProjects = await fetchFromDataGovSg();
  if (dataGovProjects && dataGovProjects.length > 0) {
    return applyJune2026Fallback(dataGovProjects);
  }

  // Fallback to hardcoded sample data
  return JUNE_2026_FALLBACK_PROJECTS;
}

/**
 * Get cached BTO projects (client-side caching for 1 hour)
 */
let cachedProjects: BtoProject[] | null = null;
let cacheTime: number = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export async function getBtoProjectsCached(): Promise<BtoProject[]> {
  const now = Date.now();

  if (cachedProjects && now - cacheTime < CACHE_DURATION) {
    return cachedProjects;
  }

  cachedProjects = await fetchBtoProjects();
  cacheTime = now;
  return cachedProjects;
}
