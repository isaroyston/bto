import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RECORDBTO_URL = new URL("../../frontend/public/data/recordbto/projects.json", import.meta.url);
const BTOHQ_URL = new URL("../../frontend/public/data/btohq/projects.json", import.meta.url);
const OUTPUT_URL = new URL("../../frontend/public/data/bto/projects.json", import.meta.url);
const RAIL_STATIONS_URL = new URL("../data/geospatial/rail-stations.geojson", import.meta.url);

const RECORDBTO_PATH = fileURLToPath(RECORDBTO_URL);
const BTOHQ_PATH = fileURLToPath(BTOHQ_URL);
const OUTPUT_PATH = fileURLToPath(OUTPUT_URL);
const RAIL_STATIONS_PATH = fileURLToPath(RAIL_STATIONS_URL);
const FLAT_TYPE_ORDER = ["2-room", "3-room", "4-room", "5-room", "executive"];
const MRT_DISTANCE_SOURCE = "URA Master Plan 2019 rail station centroid, straight-line estimate";
const LOCATION_SIGNAL_SOURCE =
  "Station centrality estimate from URA rail station geometry and curated town context";
const CORE_ANCHOR_STATIONS = ["Raffles Place", "City Hall", "Dhoby Ghaut", "Orchard"];
const LOCATION_CONTEXT_BY_TOWN = {
  "ang mo kio": { tags: ["Central mature town"], adjustment: 6 },
  bedok: { tags: ["Mature town", "East region"], adjustment: 2 },
  bidadari: { tags: ["City fringe", "Emerging estate"], adjustment: 6 },
  bishan: { tags: ["Central mature town"], adjustment: 8 },
  "bukit merah": { tags: ["City fringe", "Central mature town", "Waterfront access"], adjustment: 10 },
  "bukit timah": { tags: ["Central mature town"], adjustment: 8 },
  clementi: { tags: ["Mature town", "Education corridor"], adjustment: 5 },
  "jurong east": { tags: ["Regional centre"], adjustment: 5 },
  "kallang/whampoa": { tags: ["City fringe", "Central mature town"], adjustment: 10 },
  queenstown: { tags: ["City fringe", "Central mature town"], adjustment: 9 },
  serangoon: { tags: ["City fringe", "Mature town"], adjustment: 5 },
  "telok blangah": { tags: ["City fringe", "Waterfront access"], adjustment: 10 },
  "toa payoh": { tags: ["City fringe", "Central mature town"], adjustment: 9 },
  woodlands: { tags: ["Regional centre", "North region"], adjustment: 2 },
  yishun: { tags: ["North region"], adjustment: -2 },
  sembawang: { tags: ["North region"], adjustment: -3 },
  punggol: { tags: ["Waterfront access", "Emerging estate"], adjustment: 0 },
  sengkang: { tags: ["Emerging estate"], adjustment: -1 },
  tengah: { tags: ["Emerging estate"], adjustment: -4 },
  tampines: { tags: ["Regional centre", "Mature town"], adjustment: 4 },
};
const WATERFRONT_TERMS = [
  "berlayar",
  "telok blangah",
  "redhill",
  "waterway",
  "punggol",
  "pasir ris",
  "queenstown",
  "dawson",
  "keppel",
  "coast",
  "river",
  "bay",
];

async function main() {
  const recordbtoPayload = JSON.parse(await readFile(RECORDBTO_PATH, "utf8"));
  const btohqPayload = JSON.parse(await readFile(BTOHQ_PATH, "utf8"));
  const railStations = await loadRailStations();
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
      projects.push(enrichProject(mergeProject(recordProject, btohqProject), railStations));
    } else {
      projects.push(enrichProject(recordProject, railStations));
    }
  }

  const btohqOnlyProjects = btohqProjects
    .filter((project) => !usedBtohqIds.has(project.id))
    .map(fromBtohqProject)
    .map((project) => enrichProject(project, railStations));

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
      railStationPolicy: railStations.length
        ? "Nearest MRT distances are straight-line estimates from project coordinates to URA Master Plan 2019 rail station centroids."
        : "Rail station GeoJSON was unavailable, so nearest MRT distances were not generated.",
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
  const projectCoordinates = parseMapCoordinates(btohqProject.media?.mapUrl);

  return {
    ...recordProject,
    dataSource: "recordbto+btohq",
    flatVariants: normalizeFlatVariants(recordProject.flatVariants),
    btoType: recordProject.btoType ?? btohqProject.classification,
    expectedTop: recordProject.expectedTop ?? btohqProject.estimatedTop,
    totalUnits: recordProject.totalUnits ?? btohqProject.totalUnits,
    address: chooseDetailedString(recordProject.address, btohqProject.address),
    unitTypes: btohqProject.unitTypesText,
    availableFlatTypes,
    projectCoordinates,
    btohq: toBtohqMeta(btohqProject),
  };
}

function fromBtohqProject(project) {
  const projectCoordinates = parseMapCoordinates(project.media?.mapUrl);

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
    projectCoordinates,
    btohq: toBtohqMeta(project),
  };
}

function enrichProject(project, railStations) {
  const flatVariants = normalizeFlatVariants(project.flatVariants);
  const projectCoordinates =
    project.projectCoordinates ?? parseMapCoordinates(project.btohq?.media?.mapUrl);
  const matchedStation =
    project.nearestMrt
      ? findRailStationByName(project.nearestMrt, railStations)
      : null;
  const nearestStation = projectCoordinates
    ? matchedStation
      ? {
          ...matchedStation,
          distanceMeters: Math.round(
            haversineMeters(
              projectCoordinates.lat,
              projectCoordinates.lon,
              matchedStation.lat,
              matchedStation.lon
            )
          ),
        }
      : findNearestRailStation(projectCoordinates, railStations)
    : null;
  const nearestMrt = project.nearestMrt ?? (nearestStation ? `${titleCaseStation(nearestStation.name)} MRT` : undefined);
  const nearestMrtDistanceMeters =
    project.nearestMrtDistanceMeters ?? nearestStation?.distanceMeters;
  const nearestMrtDistanceSource =
    project.nearestMrtDistanceSource ??
    (nearestStation ? MRT_DISTANCE_SOURCE : undefined);
  const locationSignals = buildLocationSignals({
    ...project,
    nearestMrt,
    projectCoordinates,
  }, matchedStation ?? nearestStation, railStations);

  return {
    ...project,
    flatVariants,
    projectCoordinates,
    nearestMrt,
    nearestMrtDistanceMeters,
    nearestMrtDistanceSource,
    locationSignals,
    comparisonMetrics: buildComparisonMetrics({
      ...project,
      flatVariants,
      nearestMrt,
      projectCoordinates,
      nearestMrtDistanceMeters,
      locationSignals,
    }),
  };
}

function normalizeFlatVariants(variants = []) {
  return variants.map((variant) => {
    const pricePerSqm =
      Number.isFinite(variant.pricePerSqm)
        ? variant.pricePerSqm
        : Number.isFinite(variant.basePrice) && Number.isFinite(variant.floorAreaSqm) && variant.floorAreaSqm > 0
          ? Math.round(variant.basePrice / variant.floorAreaSqm)
          : undefined;

    return {
      ...variant,
      pricePerSqm,
    };
  });
}

function buildComparisonMetrics(project) {
  const pricedVariants = (project.flatVariants ?? []).filter((variant) =>
    Number.isFinite(variant.basePrice)
  );
  const prices = pricedVariants.map((variant) => variant.basePrice);
  const pricePerSqmValues = pricedVariants
    .map((variant) => variant.pricePerSqm)
    .filter((value) => Number.isFinite(value));
  const ratings = project.btohq?.ratings ?? {};

  return {
    lowestPrice: prices.length ? Math.min(...prices) : undefined,
    lowestPricePerSqm: pricePerSqmValues.length ? Math.min(...pricePerSqmValues) : undefined,
    topSortValue: monthSortValue(project.expectedTop),
    totalUnits: project.totalUnits,
    btoType: project.btoType,
    nearestMrtDistanceMeters: project.nearestMrtDistanceMeters,
    centralityScore: project.locationSignals?.centralityScore,
    accessibilityRating: ratings.accessibility,
    amenitiesRating: ratings.amenities,
    affordabilityRating: ratings.affordability,
    availableFlatTypes: project.availableFlatTypes?.length
      ? project.availableFlatTypes
      : (project.flatVariants ?? []).map((variant) => variant.type),
  };
}

function buildLocationSignals(project, station, railStations) {
  const matchedStation = station ?? findRailStationByName(project.nearestMrt, railStations);
  const context = getLocationContext(project);

  if (!matchedStation) {
    return context.tags.length
      ? {
          centralityLabel: context.tags[0],
          contextTags: context.tags,
          source: "Curated town context",
        }
      : undefined;
  }

  const anchor = findNearestCoreAnchor(matchedStation, railStations);
  const anchorScore = anchor
    ? centralityScoreFromDistance(anchor.distanceMeters)
    : 60;
  const interchangeBonus = /interchange/i.test(matchedStation.name) ? 8 : 0;
  const centralityScore = clamp(
    Math.round(anchorScore + interchangeBonus + context.adjustment),
    20,
    100
  );

  return {
    centralityScore,
    centralityLabel: centralityLabel(centralityScore),
    contextTags: context.tags,
    nearestCentralAnchor: anchor?.station ? titleCaseStation(anchor.station.name) : undefined,
    centralAnchorDistanceMeters: anchor?.distanceMeters,
    matchedStation: titleCaseStation(matchedStation.name),
    source: LOCATION_SIGNAL_SOURCE,
  };
}

function getLocationContext(project) {
  const locationKey = normalizeLocationKey(project.location);
  const districtKey = normalizeLocationKey(project.district);
  const configured =
    LOCATION_CONTEXT_BY_TOWN[locationKey] ??
    LOCATION_CONTEXT_BY_TOWN[districtKey] ??
    { tags: [], adjustment: 0 };
  const tags = new Set(configured.tags);
  const searchable = `${project.name ?? ""} ${project.location ?? ""} ${project.address ?? ""} ${project.nearestMrt ?? ""}`.toLowerCase();

  if (WATERFRONT_TERMS.some((term) => searchable.includes(term))) {
    tags.add("Waterfront access");
  }

  if (/prime/i.test(project.btoType ?? "") || project.btohq?.isPLH) {
    tags.add("Prime/Plus context");
  }

  return {
    adjustment: configured.adjustment,
    tags: Array.from(tags),
  };
}

function findNearestCoreAnchor(station, railStations) {
  const anchors = CORE_ANCHOR_STATIONS
    .map((name) => findRailStationByName(name, railStations))
    .filter(Boolean);
  let nearest = null;

  for (const anchor of anchors) {
    const distanceMeters = Math.round(
      haversineMeters(station.lat, station.lon, anchor.lat, anchor.lon)
    );

    if (!nearest || distanceMeters < nearest.distanceMeters) {
      nearest = {
        station: anchor,
        distanceMeters,
      };
    }
  }

  return nearest;
}

function centralityScoreFromDistance(distanceMeters) {
  if (distanceMeters <= 2000) return 100;
  if (distanceMeters <= 4000) return 92;
  if (distanceMeters <= 6000) return 84;
  if (distanceMeters <= 8000) return 74;
  if (distanceMeters <= 10000) return 64;
  if (distanceMeters <= 14000) return 52;
  if (distanceMeters <= 18000) return 42;
  return 35;
}

function centralityLabel(score) {
  if (score >= 85) return "Central / city fringe";
  if (score >= 72) return "Good central access";
  if (score >= 58) return "Regional access";
  if (score >= 45) return "Outer-town access";
  return "Longer city access";
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

async function loadRailStations() {
  try {
    const payload = JSON.parse(await readFile(RAIL_STATIONS_PATH, "utf8"));
    return (payload.features ?? [])
      .map(toRailStation)
      .filter(Boolean)
      .filter((station) => station.railType === "MRT");
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn(`Rail station GeoJSON could not be loaded: ${error.message}`);
    }
    return [];
  }
}

function toRailStation(feature) {
  const name = cleanString(feature.properties?.NAME);
  const railType = cleanString(feature.properties?.RAIL_TYPE);
  const centroid = getGeometryCentroid(feature.geometry);

  if (!name || !centroid) return null;

  return {
    name,
    railType,
    lat: centroid.lat,
    lon: centroid.lon,
  };
}

function getGeometryCentroid(geometry) {
  const points = [];
  collectCoordinatePairs(geometry?.coordinates, points);

  if (!points.length) return null;

  const totals = points.reduce(
    (sum, point) => ({
      lon: sum.lon + point.lon,
      lat: sum.lat + point.lat,
    }),
    { lon: 0, lat: 0 }
  );

  return {
    lon: totals.lon / points.length,
    lat: totals.lat / points.length,
  };
}

function collectCoordinatePairs(value, points) {
  if (!Array.isArray(value)) return;

  if (
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  ) {
    points.push({ lon: value[0], lat: value[1] });
    return;
  }

  for (const entry of value) {
    collectCoordinatePairs(entry, points);
  }
}

function parseMapCoordinates(mapUrl) {
  const match = String(mapUrl ?? "").match(/!2d(-?\d+(?:\.\d+)?)!3d(-?\d+(?:\.\d+)?)/);
  if (!match) return undefined;

  const lon = Number(match[1]);
  const lat = Number(match[2]);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return undefined;
  return {
    lat,
    lon,
    source: "btohq-map",
  };
}

function findNearestRailStation(projectCoordinates, railStations) {
  let nearest = null;

  for (const station of railStations) {
    const distanceMeters = Math.round(
      haversineMeters(projectCoordinates.lat, projectCoordinates.lon, station.lat, station.lon)
    );

    if (!nearest || distanceMeters < nearest.distanceMeters) {
      nearest = {
        ...station,
        distanceMeters,
      };
    }
  }

  return nearest;
}

function findRailStationByName(value, railStations) {
  const target = normalizeStationName(value);
  if (!target) return null;

  return (
    railStations.find((station) => normalizeStationName(station.name) === target) ??
    railStations.find((station) => target.includes(normalizeStationName(station.name))) ??
    railStations.find((station) => normalizeStationName(station.name).includes(target)) ??
    null
  );
}

function normalizeStationName(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\bmrt\b|\bstation\b|\binterchange\b|\blrt\b/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function normalizeLocationKey(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function haversineMeters(latA, lonA, latB, lonB) {
  const earthRadiusMeters = 6371000;
  const deltaLat = toRadians(latB - latA);
  const deltaLon = toRadians(lonB - lonA);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(latA)) *
      Math.cos(toRadians(latB)) *
      Math.sin(deltaLon / 2) ** 2;

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function titleCaseStation(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
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

function monthSortValue(value) {
  const [year, month] = monthKey(value).split("-").map(Number);
  if (!year || !month) return undefined;
  return year * 12 + month;
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

function cleanString(value) {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).replace(/\s+/g, " ").trim();
  return cleaned || null;
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
