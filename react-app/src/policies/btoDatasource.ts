import type { BtoFlatVariant, BtoProject } from "./policyConfig";
import { EHG_FAMILIES_BANDS_2024 } from "./policyConfig";

const LOCAL_PRICE_RANGE_CSV = "/data/hdb/price-range-hdb-flats-offered.csv";
const CACHE_DURATION = 60 * 60 * 1000;
const MAX_EHG_FAMILY_GRANT = EHG_FAMILIES_BANDS_2024[0]?.grantAmount ?? 120000;

type FlatType = BtoFlatVariant["type"];
type PriceRangeSource = "local-csv";
type CsvRecord = Record<string, string>;

const FLAT_TYPE_ORDER: FlatType[] = [
  "2-room",
  "3-room",
  "4-room",
  "5-room",
  "executive",
];

const FALLBACK_BTO_PROJECTS: BtoProject[] = [
  {
    id: "yung-ho-2026-06",
    launchMonth: "2026-06",
    name: "Yung Ho Road",
    location: "Tiong Bahru",
    district: "TB",
    suggestedFinancing: "hdb",
    suggestedScheme: "normal",
    dataSource: "fallback",
    schemeSource: "fallback",
    flatVariants: [
      fallbackVariant("3-room", 475000),
      fallbackVariant("4-room", 595000),
      fallbackVariant("5-room", 715000),
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
    dataSource: "fallback",
    schemeSource: "fallback",
    flatVariants: [
      fallbackVariant("3-room", 485000),
      fallbackVariant("4-room", 615000),
      fallbackVariant("5-room", 735000),
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
    dataSource: "fallback",
    schemeSource: "fallback",
    flatVariants: [
      fallbackVariant("3-room", 425000),
      fallbackVariant("4-room", 545000),
      fallbackVariant("5-room", 665000),
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
    dataSource: "fallback",
    schemeSource: "fallback",
    flatVariants: [fallbackVariant("4-room", 625000), fallbackVariant("5-room", 750000)],
  },
];

let cachedProjects: BtoProject[] | null = null;
let cacheTime = 0;

export async function fetchBtoProjects(): Promise<BtoProject[]> {
  const localProjects = await fetchFromLocalPriceRangeCsv();
  return localProjects.length > 0 ? localProjects : FALLBACK_BTO_PROJECTS;
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

async function fetchFromLocalPriceRangeCsv(): Promise<BtoProject[]> {
  try {
    const response = await fetch(LOCAL_PRICE_RANGE_CSV);
    if (!response.ok) return [];

    const records = parseCsvRecords(await response.text());
    return transformPriceRangeRecords(records, "local-csv");
  } catch {
    return [];
  }
}

function transformPriceRangeRecords(
  records: CsvRecord[],
  source: PriceRangeSource
): BtoProject[] {
  const projects = new Map<string, BtoProject>();

  records.forEach((record) => {
    const financialYear = record.financial_year?.trim();
    const town = record.town?.trim();
    const flatType = normalizeFlatType(record.room_type ?? "");
    const minPrice = toPositiveInteger(record.min_selling_price);
    const maxPrice = toPositiveInteger(record.max_selling_price);

    if (!financialYear || !town || !flatType || !minPrice || !maxPrice) {
      return;
    }

    const projectId = `${slugify(town)}-${financialYear}`;
    const project =
      projects.get(projectId) ??
      createPriceRangeProject(projectId, town, financialYear, source);

    if (!project.flatVariants.some((variant) => variant.type === flatType)) {
      project.flatVariants.push(
        priceRangeVariant(flatType, minPrice, maxPrice, source)
      );
      project.flatVariants.sort(
        (a, b) =>
          FLAT_TYPE_ORDER.indexOf(a.type) - FLAT_TYPE_ORDER.indexOf(b.type)
      );
    }

    projects.set(projectId, project);
  });

  return Array.from(projects.values()).sort((a, b) => {
    const yearA = Number(a.launchMonth.match(/\d{4}/)?.[0] ?? 0);
    const yearB = Number(b.launchMonth.match(/\d{4}/)?.[0] ?? 0);
    if (yearA !== yearB) return yearB - yearA;
    return a.location.localeCompare(b.location);
  });
}

function createPriceRangeProject(
  id: string,
  town: string,
  financialYear: string,
  source: PriceRangeSource
): BtoProject {
  return {
    id,
    launchMonth: `FY ${financialYear}`,
    name: `${town} Price Range`,
    location: town,
    district: extractDistrict(town),
    suggestedFinancing: "hdb",
    suggestedScheme: "normal",
    dataSource: source,
    schemeSource: source,
    flatVariants: [],
  };
}

function priceRangeVariant(
  type: FlatType,
  minPrice: number,
  maxPrice: number,
  source: PriceRangeSource
): BtoFlatVariant {
  return {
    type,
    basePrice: Math.round((minPrice + maxPrice) / 2),
    minPrice,
    maxPrice,
    maxEhg: MAX_EHG_FAMILY_GRANT,
    suggestedOccupants: estimateOccupants(type),
    suggestedTenureYears: type === "5-room" ? 30 : 25,
    priceSource: source,
    priceNote: "Local HDB price range dataset (min-max)",
  };
}

function fallbackVariant(type: FlatType, basePrice: number): BtoFlatVariant {
  return {
    type,
    basePrice,
    maxEhg: MAX_EHG_FAMILY_GRANT,
    suggestedOccupants: estimateOccupants(type),
    suggestedTenureYears: type === "5-room" ? 30 : 25,
    priceSource: "fallback",
    priceNote: "Fallback estimate maintained in this repo.",
  };
}

function parseCsvRecords(text: string): CsvRecord[] {
  const rows = text.trim().split(/\r?\n/).filter(Boolean);
  if (rows.length < 2) return [];

  const headers = parseCsvRow(rows[0]).map((header) => header.trim());

  return rows.slice(1).flatMap((row) => {
    const values = parseCsvRow(row);
    if (values.length < headers.length) return [];

    return [
      headers.reduce<CsvRecord>((record, header, index) => {
        record[header] = (values[index] ?? "").trim();
        return record;
      }, {}),
    ];
  });
}

function parseCsvRow(row: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < row.length; index += 1) {
    const char = row[index];
    const next = row[index + 1];

    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function normalizeFlatType(roomType: string): FlatType | null {
  const value = roomType.trim().toLowerCase();
  if (!value) return null;
  if (value.includes("executive")) return "executive";
  if (value.includes("2") && value.includes("room")) return "2-room";
  if (value.includes("3") && value.includes("room")) return "3-room";
  if (value.includes("4") && value.includes("room")) return "4-room";
  if (value.includes("5") && value.includes("room")) return "5-room";
  return null;
}

function toPositiveInteger(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/\s+/g, "-");
}

function extractDistrict(location: string): string {
  const districtMap: Record<string, string> = {
    "Ang Mo Kio": "AMK",
    Bedok: "BD",
    "Bukit Merah": "BM",
    "Bukit Timah": "BT",
    Clementi: "CL",
    Geylang: "GL",
    Hougang: "HG",
    "Jurong East": "JE",
    "Jurong West": "JW",
    "Marine Parade": "MP",
    "Pasir Ris": "PR",
    Punggol: "PG",
    Queenstown: "QT",
    Sembawang: "SB",
    Sengkang: "SK",
    Serangoon: "SR",
    Tampines: "TM",
    "Toa Payoh": "TP",
    Woodlands: "WD",
    Yishun: "YS",
  };

  for (const [name, abbr] of Object.entries(districtMap)) {
    if (location.includes(name)) return abbr;
  }

  return location.slice(0, 2).toUpperCase();
}

function estimateOccupants(flatType: FlatType): number {
  const occupants: Record<FlatType, number> = {
    "2-room": 2,
    "3-room": 3,
    "4-room": 4,
    "5-room": 5,
    executive: 5,
  };
  return occupants[flatType];
}
