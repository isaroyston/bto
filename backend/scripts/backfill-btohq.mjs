import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const BASE_URL = "https://www.btohq.com";
const LIST_URL = `${BASE_URL}/bto-sales-launch-list`;
const OUTPUT_URL = new URL("../../frontend/public/data/btohq/projects.json", import.meta.url);
const OUTPUT_PATH = fileURLToPath(OUTPUT_URL);
const REQUEST_DELAY_MS = Number(process.env.BTOHQ_DELAY_MS ?? 350);
const FETCH_PROJECT_DETAILS = process.env.BTOHQ_FETCH_DETAILS !== "0";

const MONTHS = new Map([
  ["jan", "Jan"],
  ["january", "Jan"],
  ["feb", "Feb"],
  ["february", "Feb"],
  ["mar", "Mar"],
  ["march", "Mar"],
  ["apr", "Apr"],
  ["april", "Apr"],
  ["may", "May"],
  ["jun", "Jun"],
  ["june", "Jun"],
  ["jul", "Jul"],
  ["july", "Jul"],
  ["aug", "Aug"],
  ["august", "Aug"],
  ["sep", "Sep"],
  ["sept", "Sep"],
  ["september", "Sep"],
  ["oct", "Oct"],
  ["october", "Oct"],
  ["nov", "Nov"],
  ["november", "Nov"],
  ["dec", "Dec"],
  ["december", "Dec"],
]);

const FLAT_TYPE_ORDER = ["2-room", "3-room", "4-room", "5-room", "executive"];

async function main() {
  const listHtml = await fetchHtml(LIST_URL);
  const listData = extractNextData(listHtml, LIST_URL);
  const launchRefs = listData.props?.pageProps?.allSalesLaunches ?? [];
  const launches = [];
  const projects = [];
  const warnings = [];

  for (const [launchIndex, launchRef] of launchRefs.entries()) {
    const launchSlug = toUrlSlug(launchRef.name);
    const launchUrl = `${BASE_URL}/bto-sales-launch/${launchSlug}`;
    await wait(REQUEST_DELAY_MS);

    try {
      const launchHtml = await fetchHtml(launchUrl);
      const launchData = extractNextData(launchHtml, launchUrl);
      const salesLaunch = launchData.props?.pageProps?.salesLaunch;

      if (!salesLaunch) {
        warnings.push(`No salesLaunch data for ${launchUrl}`);
        continue;
      }

      const launch = normalizeLaunch(salesLaunch, launchUrl);
      const unitSupplyByProject = groupUnitSupply(salesLaunch.BTO_PROJECTs ?? []);
      const specs = salesLaunch.BTO_PROJECT_SPECs ?? [];
      launch.projectCount = specs.length;
      launch.projects = specs.map((spec) => toProjectId(spec));
      launches.push(launch);
      console.log(
        `[${String(launchIndex + 1).padStart(2, "0")}/${launchRefs.length}] ` +
          `${launch.displayName}: ${specs.length} projects`
      );

      for (const spec of specs) {
        const projectUrl = `${BASE_URL}/bto-project-spec/${toUrlSlug(spec.name)}`;
        let detail = null;

        if (FETCH_PROJECT_DETAILS) {
          await wait(REQUEST_DELAY_MS);
          try {
            const detailHtml = await fetchHtml(projectUrl);
            const detailData = extractNextData(detailHtml, projectUrl);
            detail = normalizeProjectDetail(detailData.props?.pageProps ?? {});
          } catch (error) {
            warnings.push(`Project detail failed for ${projectUrl}: ${error.message}`);
          }
        }

        const unitSupply = unitSupplyByProject.get(normalizeKey(spec.displayName ?? spec.name)) ?? [];
        const project = normalizeProject({
          spec,
          detail,
          unitSupply,
          launch,
          projectUrl,
        });

        projects.push(project);
      }
    } catch (error) {
      warnings.push(`Launch failed for ${launchUrl}: ${error.message}`);
    }
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: LIST_URL,
    launchCount: launches.length,
    projectCount: projects.length,
    launches: launches.sort(compareLaunches),
    projects: projects.sort(compareProjects),
    warnings,
  };

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(compactObject(payload), null, 2)}\n`, "utf8");

  console.log(`Wrote ${projects.length} BTOHQ projects from ${launches.length} launches to ${OUTPUT_PATH}`);
  if (warnings.length) console.warn(`Completed with ${warnings.length} warning(s).`);
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent": "hdb-planner-btohq-backfill/1.0 (+local generated dataset)",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

function extractNextData(html, url) {
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/i
  );

  if (!match) throw new Error(`No __NEXT_DATA__ script found for ${url}`);
  return JSON.parse(decodeEntities(match[1]));
}

function normalizeLaunch(salesLaunch, sourceUrl) {
  return {
    id: salesLaunch.salesLaunchId,
    name: salesLaunch.name,
    slug: toUrlSlug(salesLaunch.name),
    displayName: launchDisplayName(salesLaunch.name),
    launchMonth: formatMonthYear(salesLaunch.date) ?? launchDisplayName(salesLaunch.name),
    date: salesLaunch.date,
    metaDescription: salesLaunch.metaDescription,
    descriptionText: htmlToText(salesLaunch.description),
    selectionStatus: salesLaunch.selectionStatus,
    status: salesLaunch.status,
    ballotInfo1: salesLaunch.ballotInfo1,
    ballotInfo2: salesLaunch.ballotInfo2,
    forumUrl: salesLaunch.forumUrl,
    sourceUrl,
  };
}

function normalizeProject({ spec, detail, unitSupply, launch, projectUrl }) {
  const displayName = cleanString(spec.displayName) ?? cleanString(spec.name) ?? `Project ${spec.projectSpecId}`;
  const descriptionText = htmlToText(spec.description);
  const flatTypeNames = detail?.flatTypeNames?.length
    ? detail.flatTypeNames
    : unitSupply.map((unit) => unit.flatTypeDesc ?? unit.flatType);
  const availableFlatTypes = normalizeFlatTypes(flatTypeNames.length ? flatTypeNames : spec.unitTypes);
  const location =
    unitSupply.find((unit) => unit.town)?.town ??
    extractEstate(spec.metaDescription) ??
    extractEstate(descriptionText) ??
    extractTownFromName(displayName);
  const classification = inferClassification(spec, descriptionText);

  return {
    id: toProjectId(spec),
    projectSpecId: spec.projectSpecId,
    salesLaunchId: spec.salesLaunchId,
    launchName: launch.name,
    launchMonth: launch.launchMonth,
    displayName,
    slug: toUrlSlug(spec.name),
    sourceUrl: projectUrl,
    launchSourceUrl: launch.sourceUrl,
    location: location ?? "Singapore",
    district: extractDistrict(location),
    classification,
    btohqTypeCode: spec.type,
    isPLH: toBoolean(spec.isPLH),
    address: cleanString(spec.newAddress) || cleanString(spec.address),
    originalAddress: cleanString(spec.address),
    noOfBlocks: toNumber(spec.noOfBlocks),
    totalUnits: toNumber(spec.totalUnits),
    unitTypesText: cleanString(spec.unitTypes),
    availableFlatTypes,
    highestFloor: toNumber(spec.highestFloor),
    estimatedTOPDate: spec.estimatedTOPDate,
    estimatedTop: formatMonthYear(spec.estimatedTOPDate),
    delayedTOPDate: spec.delayedTOPDate,
    actualTOPDate: spec.actualTOPDate,
    estimatedMOPDate: spec.estimatedMOPDate,
    announcementDate: spec.announcementDate,
    tenure: cleanString(spec.tenure),
    developer: cleanString(spec.developer),
    metaDescription: cleanString(spec.metaDescription),
    descriptionHtml: cleanString(spec.description),
    descriptionText,
    analysisText: htmlToText(spec.analysis),
    ratings: {
      accessibility: toNumber(spec.accessibility),
      amenities: toNumber(spec.amenities),
      affordability: toNumber(spec.affordability),
    },
    nearbyAmenities: {
      convenienceStore: cleanDash(spec.convenienceStore),
      petrolStation: cleanDash(spec.petrolStation),
      atm: cleanDash(spec.atm),
      axs: cleanDash(spec.axs),
      gym: cleanDash(spec.gym),
      policePost: cleanDash(spec.policePost),
      clinic: cleanDash(spec.clinic),
      hospital: cleanDash(spec.hospital),
    },
    media: {
      logoUrl: assetUrl(spec.logoPath, spec.logoFile),
      imageUrl: assetUrl(spec.imagePath, spec.imageFile),
      brochureUrl: cleanString(spec.brochureUrl),
      mapUrl: cleanString(spec.mapUrl),
      noOfSitePlan: toNumber(spec.noOfSitePlan),
      noOfUnitDistribution: toNumber(spec.noOfUnitDistribution),
      galleries: detail?.galleries,
      floorPlans: detail?.floorPlans,
      developmentImages: detail?.developmentImages,
    },
    construction: {
      foundationWork: toNumber(spec.foundationWork),
      structuralWork: toNumber(spec.structuralWork),
      architecturalWork: toNumber(spec.architecturalWork),
      externalFeatureWork: toNumber(spec.externalFeatureWork),
      inspectionWork: toNumber(spec.inspectionWork),
      isTOPIssued: toBoolean(spec.isTOPIssued),
    },
    unitSupply: unitSupply.map(normalizeUnitSupply),
    unitsData: detail?.unitsData,
    selectedUnitsChartData: detail?.selectedUnitsChartData,
    projectAnalysis: detail?.projectAnalysis,
    status: spec.status,
    remarks: cleanString(spec.remarks),
  };
}

function normalizeProjectDetail(pageProps) {
  const projectSpec = pageProps.projectSpec ?? {};

  return {
    flatTypeNames: (pageProps.projects ?? [])
      .map((project) => cleanString(project.flatType))
      .filter(Boolean),
    unitsData: pageProps.unitsData,
    selectedUnitsChartData: pageProps.selectedUnitsChartdata,
    developmentImages: pageProps.developmentImages,
    galleries: projectSpec.BTO_PROJECT_SPEC_GALLERies,
    floorPlans: projectSpec.BTO_PROJECT_SPEC_FLOORPLANs,
    projectAnalysis: projectSpec.BTO_PROJECT_SPEC_ANALYSIS,
  };
}

function groupUnitSupply(units) {
  const grouped = new Map();

  for (const unit of units) {
    const key = normalizeKey(unit.groupName ?? unit.name);
    grouped.set(key, [...(grouped.get(key) ?? []), unit]);
  }

  return grouped;
}

function normalizeUnitSupply(unit) {
  return {
    projectId: unit.projectId,
    town: cleanString(unit.town),
    flatType: normalizeFlatType(unit.flatTypeDesc ?? unit.flatType) ?? cleanString(unit.flatType),
    flatTypeDesc: cleanString(unit.flatTypeDesc ?? unit.flatType),
    unitsOffered: toNumber(unit.unitsOffered),
    unitsAvailable: toNumber(unit.unitsAvailable),
    applicants: toNumber(unit.applicants),
    rates: {
      elderly: parseRate(unit.elderly),
      firstTimers: parseRate(unit.firstTimers),
      secondTimers: parseRate(unit.secondTimers),
      singles: parseRate(unit.singles),
      overall: parseRate(unit.overall),
    },
    queueNo: toNumber(unit.queueNo),
    isMatureTown: toBoolean(unit.isMatureTown),
    status: unit.status,
    isDisplay: toBoolean(unit.isDisplay),
    updatedAt: unit.updatedAt,
  };
}

function inferClassification(spec, text) {
  const source = `${spec.displayName ?? ""} ${spec.metaDescription ?? ""} ${text ?? ""}`.toLowerCase();

  if (source.includes("prime flats") || spec.type === 3 || toBoolean(spec.isPLH)) return "prime";
  if (source.includes("plus flats") || spec.type === 4) return "plus";
  if (source.includes("standard flats") || spec.type === 1) return "standard";
  return null;
}

function normalizeFlatTypes(value) {
  const values = Array.isArray(value) ? value : String(value ?? "").split(/,|\band\b/i);
  const types = new Set();

  for (const item of values) {
    const type = normalizeFlatType(item);
    if (type) types.add(type);
  }

  return Array.from(types).sort(
    (a, b) => FLAT_TYPE_ORDER.indexOf(a) - FLAT_TYPE_ORDER.indexOf(b)
  );
}

function normalizeFlatType(value) {
  const text = String(value ?? "").toLowerCase();
  if (text.includes("2-room")) return "2-room";
  if (text.includes("3-room") || text.includes("3-room")) return "3-room";
  if (text.includes("4-room") || text.includes("4-room")) return "4-room";
  if (text.includes("5-room") || text.includes("5-room")) return "5-room";
  if (text.includes("executive")) return "executive";
  return null;
}

function toProjectId(spec) {
  return toUrlSlug(spec.name ?? spec.displayName ?? `project-${spec.projectSpecId}`);
}

function toUrlSlug(value) {
  return String(value ?? "")
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function launchDisplayName(value) {
  const match = String(value ?? "").match(/^([A-Za-z]+)-((?:19|20)\d{2})-BTO$/i);
  if (!match) return String(value ?? "").replace(/-/g, " ");

  const month = MONTHS.get(match[1].toLowerCase()) ?? titleCase(match[1]);
  return `${month} ${match[2]} BTO`;
}

function formatMonthYear(dateValue) {
  if (!dateValue) return null;
  const match = String(dateValue).match(/^((?:19|20)\d{2})-(\d{2})-\d{2}/);
  if (!match) return null;

  const monthLabels = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = monthLabels[Number(match[2]) - 1];
  return month ? `${month} ${match[1]}` : null;
}

function htmlToText(value) {
  if (!value) return null;

  return decodeEntities(
    String(value)
      .replace(/<script\b[\s\S]*?<\/script>/gi, "")
      .replace(/<style\b[\s\S]*?<\/style>/gi, "")
      .replace(/<\/(p|div|li|tr|td|th|br)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(value) {
  return String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([a-f0-9]+);/gi, (_, code) =>
      String.fromCharCode(Number.parseInt(code, 16))
    )
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractEstate(value) {
  const match = String(value ?? "").match(/located in\s+([^,.]+?)\s+estate/i);
  return match ? cleanString(match[1]) : null;
}

function extractTownFromName(value) {
  const firstWord = String(value ?? "").split(/\s+/)[0];
  return firstWord && firstWord.length > 2 ? firstWord : "Singapore";
}

function extractDistrict(location) {
  const districtMap = {
    "Ang Mo Kio": "AMK",
    Bedok: "BD",
    Bidadari: "BI",
    Bishan: "BS",
    "Bukit Batok": "BB",
    "Bukit Merah": "BM",
    "Bukit Panjang": "BP",
    "Choa Chu Kang": "CCK",
    Clementi: "CL",
    Geylang: "GL",
    Hougang: "HG",
    "Jurong East": "JE",
    "Jurong West": "JW",
    "Kallang/Whampoa": "KW",
    Punggol: "PG",
    Queenstown: "QT",
    Sembawang: "SB",
    Sengkang: "SK",
    Tampines: "TM",
    Tengah: "TG",
    "Toa Payoh": "TP",
    Woodlands: "WD",
    Yishun: "YS",
  };

  const source = String(location ?? "");
  for (const [name, code] of Object.entries(districtMap)) {
    if (source.toLowerCase().includes(name.toLowerCase())) return code;
  }

  return source.slice(0, 3).toUpperCase() || "SG";
}

function assetUrl(pathPart, filePart) {
  const file = cleanString(filePart);
  if (!file) return null;
  if (/^https?:\/\//i.test(file)) return file;

  const folder = cleanString(pathPart);
  const parts = ["bto", folder, file].filter(Boolean).map(encodeURIComponent);
  return `https://btohq.sgp1.cdn.digitaloceanspaces.com/${parts.join("/")}`;
}

function parseRate(value) {
  if (value === null || value === undefined || value === "") return null;
  const rate = Number.parseFloat(String(value));
  return Number.isFinite(rate) ? rate : null;
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function toBoolean(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") return ["1", "true", "yes"].includes(value.toLowerCase());
  return Boolean(value);
}

function cleanDash(value) {
  const cleaned = cleanString(value);
  return cleaned === "-" ? null : cleaned;
}

function cleanString(value) {
  if (value === null || value === undefined) return null;
  const cleaned = decodeEntities(String(value)).replace(/\s+/g, " ").trim();
  return cleaned || null;
}

function normalizeKey(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function compareLaunches(a, b) {
  return sortableDate(b.date).localeCompare(sortableDate(a.date));
}

function compareProjects(a, b) {
  if (a.launchName !== b.launchName) {
    return sortableLaunch(b.launchMonth).localeCompare(sortableLaunch(a.launchMonth));
  }
  if (a.location !== b.location) return String(a.location).localeCompare(String(b.location));
  return String(a.displayName ?? a.id).localeCompare(String(b.displayName ?? b.id));
}

function sortableDate(value) {
  return value ? String(value) : "0000-00-00";
}

function sortableLaunch(value) {
  const match = String(value ?? "").match(/([A-Za-z]+)\s+((?:19|20)\d{2})/);
  if (!match) return "0000-00";

  const monthEntries = Array.from(MONTHS.entries()).filter(([key]) => key.length === 3);
  const monthIndex = monthEntries.findIndex(([, label]) => label === match[1]);
  return `${match[2]}-${String(monthIndex + 1).padStart(2, "0")}`;
}

function titleCase(value) {
  return String(value ?? "").charAt(0).toUpperCase() + String(value ?? "").slice(1).toLowerCase();
}

function compactObject(value) {
  if (Array.isArray(value)) return value.map(compactObject);

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => {
          if (entryValue === null || entryValue === undefined) return false;
          if (Array.isArray(entryValue) && entryValue.length === 0) return false;
          return true;
        })
        .map(([key, entryValue]) => [key, compactObject(entryValue)])
    );
  }

  return value;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
