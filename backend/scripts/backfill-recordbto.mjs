import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const BASE_URL = "https://recordbto.com";
const LIST_URL = `${BASE_URL}/bto`;
const OUTPUT_URL = new URL("../../frontend/public/data/recordbto/projects.json", import.meta.url);
const OUTPUT_PATH = fileURLToPath(OUTPUT_URL);
const MAX_PAGES = 50;
const REQUEST_DELAY_MS = Number(process.env.RECORDBTO_DELAY_MS ?? 350);
const MAX_EHG_FAMILY_GRANT = 120000;

const EXCLUDED_BTO_PATHS = new Set([
  "/bto/tracker",
  "/bto/launches",
  "/bto/sales-launches",
  "/bto/brochures",
]);

const MONTHS = new Map([
  ["jan", "01"],
  ["january", "01"],
  ["feb", "02"],
  ["february", "02"],
  ["mar", "03"],
  ["march", "03"],
  ["apr", "04"],
  ["april", "04"],
  ["may", "05"],
  ["jun", "06"],
  ["june", "06"],
  ["jul", "07"],
  ["july", "07"],
  ["aug", "08"],
  ["august", "08"],
  ["sep", "09"],
  ["sept", "09"],
  ["september", "09"],
  ["oct", "10"],
  ["october", "10"],
  ["nov", "11"],
  ["november", "11"],
  ["dec", "12"],
  ["december", "12"],
]);

const FLAT_TYPE_ORDER = ["2-room", "3-room", "4-room", "5-room", "executive"];

async function main() {
  const listedProjects = await collectProjectLinks();
  const projects = [];

  for (const [index, listedProject] of listedProjects.entries()) {
    await wait(REQUEST_DELAY_MS);
    const html = await fetchHtml(listedProject.url);
    const project = parseProjectPage(html, listedProject);
    projects.push(project);

    console.log(
      `[${String(index + 1).padStart(3, "0")}/${listedProjects.length}] ${project.name}`
    );
  }

  const cleanedProjects = projects.map(compactObject).sort(compareProjects);

  const payload = {
    generatedAt: new Date().toISOString(),
    source: LIST_URL,
    projectCount: cleanedProjects.length,
    projects: cleanedProjects,
  };

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  console.log(`Wrote ${cleanedProjects.length} RecordBTO projects to ${OUTPUT_PATH}`);
}

async function collectProjectLinks() {
  const projects = new Map();
  let expectedTotal = null;

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const pageUrl = page === 1 ? LIST_URL : `${LIST_URL}?page=${page}`;
    const html = await fetchHtml(pageUrl);
    expectedTotal ??= extractExpectedTotal(html);

    for (const listedProject of extractProjectLinks(html)) {
      projects.set(listedProject.url, listedProject);
    }

    if (expectedTotal && projects.size >= expectedTotal) break;
    if (!html.includes("Next")) break;

    await wait(REQUEST_DELAY_MS);
  }

  const listedProjects = Array.from(projects.values());
  if (expectedTotal && listedProjects.length !== expectedTotal) {
    console.warn(
      `Expected ${expectedTotal} projects from listing, found ${listedProjects.length}.`
    );
  }

  return listedProjects;
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent":
        "bto-planner-data-refresh/1.0 (+https://recordbto.com/bto one-time backfill)",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

function extractExpectedTotal(html) {
  const text = toPlainText(html);
  const match =
    text.match(/Showing\s+\d+\s+to\s+\d+\s+of\s+([\d,]+)\s+results/i) ??
    text.match(/([\d,]+)\s+projects\s+found/i);

  return match ? toInteger(match[1]) : null;
}

function extractProjectLinks(html) {
  const links = [];
  const anchorPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = anchorPattern.exec(html))) {
    const href = match[1];
    const url = new URL(href, BASE_URL);
    const path = url.pathname.replace(/\/$/, "");

    if (!isProjectPath(path)) continue;

    links.push({
      id: path.split("/").pop(),
      url: url.toString(),
      summary: normalizeWhitespace(stripTags(match[2])),
    });
  }

  return links;
}

function isProjectPath(path) {
  return (
    path.startsWith("/bto/") &&
    !EXCLUDED_BTO_PATHS.has(path) &&
    /^\/bto\/[a-z0-9-]+$/i.test(path)
  );
}

function parseProjectPage(html, listedProject) {
  const lines = toLines(html);
  const text = lines.join("\n");
  const compactText = normalizeWhitespace(text);
  const detail = (label) => getLabelValue(lines, label);
  const name = extractHeading(html, "h1") ?? titleCaseFromSlug(listedProject.id);
  const status = findFirstLine(lines, ["Upcoming", "Launched", "Construction", "Completed"]);
  const address = findAddress(lines, name);
  const launchMonth = detail("Launch Date") ?? extractTextMatch(compactText, /Launch:\s*([A-Za-z]+\s+\d{4})/i);
  const expectedTop = detail("Expected TOP") ?? extractTextMatch(compactText, /Expected TOP:\s*([A-Za-z]+\s+\d{4})/i);
  const totalUnits = toInteger(
    detail("Total Units") ?? extractTextMatch(compactText, /Units:\s*([\d,]+)/i)
  );
  const btoType = normalizeLower(
    detail("BTO Type") ?? extractTextMatch(compactText, /Type:\s*(standard|plus|prime)/i)
  );
  const town = detail("Town") ?? extractTownFromSummary(listedProject.summary) ?? "Singapore";
  const district = extractDistrict(town);
  const nearestMrt = detail("Nearest MRT");
  const waitTimeMonths = extractTextMatch(compactText, /Wait Time:\s*([\d/]+\s*months)/i);
  const constructionProgress = toInteger(
    extractTextMatch(compactText, /Construction Progress\s+(\d+)%/i) ??
      extractTextMatch(compactText, /Overall Progress\s+(\d+)%/i)
  );
  const priceRange = extractPriceRange(`${listedProject.summary} ${compactText}`);
  const flatVariants = parseFlatVariants(text);

  return {
    id: listedProject.id,
    launchMonth: launchMonth ?? "Unknown",
    name,
    location: town,
    district,
    suggestedFinancing: "hdb",
    suggestedScheme: "normal",
    dataSource: "recordbto",
    schemeSource: "recordbto",
    flatVariants,
    status: status?.toLowerCase(),
    address,
    btoType,
    expectedTop,
    totalUnits,
    minPrice: priceRange?.minPrice ?? null,
    maxPrice: priceRange?.maxPrice ?? null,
    waitTimeMonths,
    nearestMrt,
    constructionProgress,
    sourceUrl: listedProject.url,
  };
}

function parseFlatVariants(text) {
  const variants = new Map();
  const tableText = text
    .replace(/\$\s+\$/g, "$ - $")
    .replace(/\${2,}/g, "$");
  const pricePattern = /(\d{2,3})\s*sqm\s+\$?\s*([\d,]+)\s*-\s*\$?\s*([\d,]+)/gi;
  let match;

  while ((match = pricePattern.exec(tableText))) {
    const areaSqm = toInteger(match[1]);
    const minPrice = toInteger(match[2]);
    const maxPrice = toInteger(match[3]);
    const type = inferFlatType(areaSqm);

    if (!type || !minPrice || !maxPrice) continue;

    const existing = variants.get(type);
    const nextMinPrice = existing ? Math.min(existing.minPrice, minPrice) : minPrice;
    const nextMaxPrice = existing ? Math.max(existing.maxPrice, maxPrice) : maxPrice;

    variants.set(type, {
      type,
      basePrice: Math.round((nextMinPrice + nextMaxPrice) / 2),
      minPrice: nextMinPrice,
      maxPrice: nextMaxPrice,
      floorAreaSqm: areaSqm,
      maxEhg: MAX_EHG_FAMILY_GRANT,
      suggestedOccupants: estimateOccupants(type),
      suggestedTenureYears: type === "5-room" ? 30 : 25,
      priceSource: "recordbto",
      priceNote: "RecordBTO project detail page price range",
    });
  }

  return Array.from(variants.values()).sort(
    (a, b) => FLAT_TYPE_ORDER.indexOf(a.type) - FLAT_TYPE_ORDER.indexOf(b.type)
  );
}

function extractPriceRange(text) {
  const match = normalizeWhitespace(text).match(
    /Price Range\s+\$([\d,.]+\s*[KM]?)\s*-\s*\$([\d,.]+\s*[KM]?)/i
  );

  if (!match) return null;

  const minPrice = parseMoney(match[1]);
  const maxPrice = parseMoney(match[2]);

  return minPrice && maxPrice ? { minPrice, maxPrice } : null;
}

function parseMoney(value) {
  const normalized = String(value).replace(/,/g, "").trim().toUpperCase();
  const amount = Number.parseFloat(normalized);

  if (!Number.isFinite(amount)) return null;
  if (normalized.endsWith("K")) return Math.round(amount * 1000);
  if (normalized.endsWith("M")) return Math.round(amount * 1000000);
  return Math.round(amount);
}

function inferFlatType(areaSqm) {
  if (!areaSqm) return null;
  if (areaSqm <= 55) return "2-room";
  if (areaSqm <= 75) return "3-room";
  if (areaSqm <= 98) return "4-room";
  if (areaSqm <= 125) return "5-room";
  return "executive";
}

function estimateOccupants(flatType) {
  return {
    "2-room": 2,
    "3-room": 3,
    "4-room": 4,
    "5-room": 5,
    executive: 5,
  }[flatType];
}

function getLabelValue(lines, label) {
  const target = label.toLowerCase();

  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].toLowerCase() !== target) continue;

    for (let valueIndex = index + 1; valueIndex < lines.length; valueIndex += 1) {
      const value = lines[valueIndex];
      if (value && value.toLowerCase() !== target) return value;
    }
  }

  return null;
}

function findFirstLine(lines, values) {
  const valueSet = new Set(values.map((value) => value.toLowerCase()));
  return lines.find((line) => valueSet.has(line.toLowerCase())) ?? null;
}

function findAddress(lines, name) {
  const nameIndex = lines.findIndex((line) => line === name);
  if (nameIndex < 0) return null;

  for (let index = nameIndex + 1; index < Math.min(lines.length, nameIndex + 5); index += 1) {
    const line = lines[index];
    if (
      line &&
      !["Project Details", "View", "Artist Impression"].includes(line) &&
      !["upcoming", "launched", "construction", "completed"].includes(line.toLowerCase())
    ) {
      return line;
    }
  }

  return null;
}

function extractTownFromSummary(summary) {
  const beforeLaunch = summary.split(/\s+Launch:/i)[0] ?? "";
  const commaParts = beforeLaunch.split(",").map((part) => part.trim()).filter(Boolean);
  const town = commaParts[commaParts.length - 1];

  if (!town || town.length > 40) return null;
  return town;
}

function compareProjects(a, b) {
  const dateA = launchMonthSortable(a.launchMonth);
  const dateB = launchMonthSortable(b.launchMonth);
  if (dateA !== dateB) return dateB.localeCompare(dateA);
  return a.name.localeCompare(b.name);
}

function launchMonthSortable(value) {
  const match = String(value).match(/([A-Za-z]+)\s+((?:19|20)\d{2})/);
  if (!match) return "0000-00";

  const month = MONTHS.get(match[1].toLowerCase()) ?? "00";
  return `${match[2]}-${month}`;
}

function extractHeading(html, tagName) {
  const match = html.match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match ? normalizeWhitespace(stripTags(match[1])) : null;
}

function extractTextMatch(text, pattern) {
  const match = text.match(pattern);
  return match ? normalizeWhitespace(match[1]) : null;
}

function toLines(html) {
  return toPlainText(html)
    .split("\n")
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);
}

function toPlainText(html) {
  return decodeEntities(
    html
      .replace(/<script\b[\s\S]*?<\/script>/gi, "")
      .replace(/<style\b[\s\S]*?<\/style>/gi, "")
      .replace(/<svg\b[\s\S]*?<\/svg>/gi, "")
      .replace(/<\/(h[1-6]|p|div|section|article|header|footer|li|tr|td|th|dt|dd|br)>/gi, "\n")
      .replace(/<(h[1-6]|p|div|section|article|header|footer|li|tr|td|th|dt|dd|br)\b[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  );
}

function stripTags(html) {
  return decodeEntities(html.replace(/<[^>]+>/g, " "));
}

function decodeEntities(value) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([a-f0-9]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizeWhitespace(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

function normalizeLower(value) {
  return value ? value.toLowerCase() : null;
}

function toInteger(value) {
  if (!value) return null;
  const parsed = Number.parseInt(String(value).replace(/[^\d]/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function titleCaseFromSlug(slug) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function extractDistrict(location) {
  const districtMap = {
    "Ang Mo Kio": "AMK",
    Bartley: "BY",
    Bedok: "BD",
    Bidadari: "BI",
    Bishan: "BS",
    "Bukit Batok": "BB",
    "Bukit Merah": "BM",
    "Bukit Panjang": "BP",
    "Bukit Timah": "BT",
    "Choa Chu Kang": "CCK",
    Clementi: "CL",
    Hougang: "HG",
    "Jurong East": "JE",
    "Jurong West": "JW",
    "Kallang/Whampoa": "KW",
    MacPherson: "MP",
    Punggol: "PG",
    Queenstown: "QT",
    Sembawang: "SB",
    Sengkang: "SK",
    Serangoon: "SR",
    Tampines: "TM",
    "Telok Blangah": "TB",
    Tengah: "TG",
    "Toa Payoh": "TP",
    Woodlands: "WD",
    Yishun: "YS",
  };

  for (const [name, abbr] of Object.entries(districtMap)) {
    if (location.includes(name)) return abbr;
  }

  return location.slice(0, 3).toUpperCase();
}

function compactObject(value) {
  if (Array.isArray(value)) return value.map(compactObject);

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== null && entryValue !== undefined)
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
