import type { BtoProject, BtoFlatVariant } from "./policyConfig";

/**
 * Fallback hardcoded BTO projects (sample data from recent launces)
 * These are updated periodically - ideally fetched from HDB API
 */
const FALLBACK_BTO_PROJECTS: BtoProject[] = [
  {
    id: "yung-ho-2026-06",
    launchMonth: "2026-06",
    name: "Yung Ho Road",
    location: "Tiong Bahru",
    district: "TB",
    suggestedFinancing: "hdb",
    suggestedScheme: "normal",
    flatVariants: [
      { type: "3-room", basePrice: 475000, maxEhg: 85000, suggestedOccupants: 3, suggestedTenureYears: 25 },
      { type: "4-room", basePrice: 595000, maxEhg: 110000, suggestedOccupants: 4, suggestedTenureYears: 25 },
      { type: "5-room", basePrice: 715000, maxEhg: 130000, suggestedOccupants: 5, suggestedTenureYears: 30 },
    ],
  },
  {
    id: "bedok-north-2026-06",
    launchMonth: "2026-06",
    name: "Bedok North",
    location: "Bedok",
    district: "BD",
    suggestedFinancing: "hdb",
    suggestedScheme: "normal",
    flatVariants: [
      { type: "3-room", basePrice: 485000, maxEhg: 85000, suggestedOccupants: 3, suggestedTenureYears: 25 },
      { type: "4-room", basePrice: 615000, maxEhg: 110000, suggestedOccupants: 4, suggestedTenureYears: 25 },
      { type: "5-room", basePrice: 735000, maxEhg: 130000, suggestedOccupants: 5, suggestedTenureYears: 30 },
    ],
  },
  {
    id: "tengah-2026-08",
    launchMonth: "2026-08",
    name: "Tengah",
    location: "Tengah",
    district: "TG",
    suggestedFinancing: "hdb",
    suggestedScheme: "staggered",
    flatVariants: [
      { type: "3-room", basePrice: 425000, maxEhg: 85000, suggestedOccupants: 3, suggestedTenureYears: 25 },
      { type: "4-room", basePrice: 545000, maxEhg: 110000, suggestedOccupants: 4, suggestedTenureYears: 25 },
      { type: "5-room", basePrice: 665000, maxEhg: 130000, suggestedOccupants: 5, suggestedTenureYears: 30 },
    ],
  },
  {
    id: "sengkang-2026-08",
    launchMonth: "2026-08",
    name: "Sengkang",
    location: "Sengkang",
    district: "SK",
    suggestedFinancing: "hdb",
    suggestedScheme: "normal",
    flatVariants: [
      { type: "4-room", basePrice: 625000, maxEhg: 110000, suggestedOccupants: 4, suggestedTenureYears: 25 },
      { type: "5-room", basePrice: 750000, maxEhg: 130000, suggestedOccupants: 5, suggestedTenureYears: 30 },
    ],
  },
];

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
        "resource_id=66e148a8-70dd-4eda-8ef8-8d53b18c1e23&limit=100"
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
      const projectName = String(record["Project Name"] || record["project_name"] || "");
      const location = String(record["Location"] || record["location"] || "");
      const launchMonth = String(record["Launch Month"] || record["launch_month"] || "");
      const flatType = String(record["Flat Type"] || record["flat_type"] || "");
      const basePrice = parseInt(String(record["Base Price"] || record["base_price"] || "0"), 10);

      if (!projectName || !flatType || basePrice <= 0) continue;

      // Create project key
      const projectId = projectName.toLowerCase().replace(/\s+/g, "-");
      const normalizedLaunchMonth = normalizeDate(launchMonth);

      // Initialize project if not exists
      if (!projects[projectId]) {
        projects[projectId] = {
          id: `${projectId}-${normalizedLaunchMonth}`,
          launchMonth: normalizedLaunchMonth,
          name: projectName,
          location: location,
          district: extractDistrict(location),
          suggestedFinancing: "hdb",
          suggestedScheme: "normal",
          flatVariants: [],
        };
      }

      // Add flat variant
      const flatTypeKey = flatType as "2-room" | "3-room" | "4-room" | "5-room" | "executive";
      if (["2-room", "3-room", "4-room", "5-room", "executive"].includes(flatTypeKey)) {
        const variant: BtoFlatVariant = {
          type: flatTypeKey,
          basePrice,
          maxEhg: estimateMaxEhg(flatTypeKey),
          suggestedOccupants: estimateOccupants(flatTypeKey),
          suggestedTenureYears: flatTypeKey === "5-room" ? 30 : 25,
        };

        // Avoid duplicates
        if (!projects[projectId].flatVariants.some((v) => v.type === variant.type)) {
          projects[projectId].flatVariants.push(variant);
        }
      }
    } catch (err) {
      console.warn("Error transforming record:", record, err);
      continue;
    }
  }

  return Object.values(projects);
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
    "executive": 140000,
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
    "executive": 5,
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
    console.log("✓ Loaded BTO projects from data.gov.sg");
    return dataGovProjects;
  }

  // Fallback to hardcoded sample data
  console.log("⚠ Using fallback BTO projects (hardcoded sample data)");
  return FALLBACK_BTO_PROJECTS;
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
    console.log("✓ Using cached BTO projects");
    return cachedProjects;
  }

  cachedProjects = await fetchBtoProjects();
  cacheTime = now;
  return cachedProjects;
}
