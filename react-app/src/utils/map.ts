export type AreaPath = {
  key: string;
  label: string;
  path: string;
};

type GeoPoint = [number, number, number?];
type GeoPolygon = GeoPoint[][];
type GeoMultiPolygon = GeoPoint[][][];

type GeoGeometry =
  | { type: "Polygon"; coordinates: GeoPolygon }
  | { type: "MultiPolygon"; coordinates: GeoMultiPolygon };

type GeoFeature = {
  type: "Feature";
  geometry: GeoGeometry | null;
  properties?: Record<string, unknown>;
};

export type GeoFeatureCollection = {
  type: "FeatureCollection";
  features: GeoFeature[];
};

type ProjectionBounds = {
  minLon: number;
  maxLon: number;
  minLat: number;
  maxLat: number;
};

const MAP_PADDING_RATIO = 0.04;
const BLUE_RAMP_LOW: [number, number, number] = [213, 233, 255];
const BLUE_RAMP_MID: [number, number, number] = [86, 156, 255];
const BLUE_RAMP_HIGH: [number, number, number] = [11, 60, 138];

export const getBlueRampColor = (ratio: number) => {
  const t = Math.min(1, Math.max(0, ratio));
  const mid = 0.55;
  const [r, g, b] =
    t <= mid
      ? mixRgb(BLUE_RAMP_LOW, BLUE_RAMP_MID, t / mid)
      : mixRgb(BLUE_RAMP_MID, BLUE_RAMP_HIGH, (t - mid) / (1 - mid));

  return `rgb(${r}, ${g}, ${b})`;
};

export const resolveAreaKey = (value: string, planningAreas: AreaPath[]) => {
  const normalized = normalizeAreaKey(value);
  if (planningAreas.length === 0) return normalized;
  if (planningAreas.some((area) => area.key === normalized)) return normalized;

  let bestMatch: AreaPath | null = null;
  for (const area of planningAreas) {
    if (normalized.includes(area.key) || area.key.includes(normalized)) {
      if (!bestMatch || area.key.length > bestMatch.key.length) {
        bestMatch = area;
      }
    }
  }

  return bestMatch?.key ?? normalized;
};

export const buildAreaPaths = (
  collection: GeoFeatureCollection | null
): AreaPath[] => {
  if (!collection || !Array.isArray(collection.features)) return [];

  const bounds = getProjectionBounds(collection.features);
  if (!bounds) return [];

  return collection.features
    .map((feature) => {
      const areaName = getAreaName(feature);
      if (!areaName || !feature.geometry) return null;

      const path = getOuterRings(feature.geometry)
        .map((ring) => ringToPath(ring, bounds))
        .filter((segment) => segment.length > 0)
        .join(" ");

      if (!path) return null;

      return {
        key: normalizeAreaKey(areaName),
        label: areaName,
        path,
      };
    })
    .filter((entry): entry is AreaPath => Boolean(entry));
};

const getProjectionBounds = (features: GeoFeature[]): ProjectionBounds | null => {
  const bounds: ProjectionBounds = {
    minLon: Number.POSITIVE_INFINITY,
    maxLon: Number.NEGATIVE_INFINITY,
    minLat: Number.POSITIVE_INFINITY,
    maxLat: Number.NEGATIVE_INFINITY,
  };

  features.forEach((feature) => {
    getOuterRings(feature.geometry).forEach((ring) => {
      ring.forEach(([lon, lat]) => {
        if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;

        bounds.minLon = Math.min(bounds.minLon, lon);
        bounds.maxLon = Math.max(bounds.maxLon, lon);
        bounds.minLat = Math.min(bounds.minLat, lat);
        bounds.maxLat = Math.max(bounds.maxLat, lat);
      });
    });
  });

  return Number.isFinite(bounds.minLon) ? bounds : null;
};

const ringToPath = (ring: GeoPoint[], bounds: ProjectionBounds) => {
  if (ring.length <= 1) return "";

  const lonSpan = bounds.maxLon - bounds.minLon || 1;
  const latSpan = bounds.maxLat - bounds.minLat || 1;
  const paddedMinLon = bounds.minLon - lonSpan * MAP_PADDING_RATIO;
  const paddedMaxLon = bounds.maxLon + lonSpan * MAP_PADDING_RATIO;
  const paddedMinLat = bounds.minLat - latSpan * MAP_PADDING_RATIO;
  const paddedMaxLat = bounds.maxLat + latSpan * MAP_PADDING_RATIO;
  const lonRange = paddedMaxLon - paddedMinLon || 1;
  const latRange = paddedMaxLat - paddedMinLat || 1;

  const points = ring
    .map(([lon, lat]) => {
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;

      const x = ((lon - paddedMinLon) / lonRange) * 100;
      const y = ((paddedMaxLat - lat) / latRange) * 70;
      return `${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .filter((point): point is string => Boolean(point));

  return points.length > 0 ? `M ${points.join(" L ")} Z` : "";
};

const getOuterRings = (geometry: GeoGeometry | null): GeoPoint[][] => {
  if (!geometry) return [];
  if (geometry.type === "Polygon") {
    return geometry.coordinates.length > 0 ? [geometry.coordinates[0]] : [];
  }

  return geometry.coordinates
    .map((polygon) => polygon[0])
    .filter((ring): ring is GeoPoint[] => Array.isArray(ring));
};

const getAreaName = (feature: GeoFeature): string | null => {
  if (!feature.properties) return null;

  const directName = feature.properties.PLN_AREA_N;
  if (typeof directName === "string" && directName.trim().length > 0) {
    return directName.trim();
  }

  const altName = feature.properties.PLANNING_AREA ?? feature.properties.name;
  return typeof altName === "string" && altName.trim().length > 0
    ? altName.trim()
    : null;
};

const normalizeAreaKey = (value: string) =>
  value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s*\/\s*/g, " ")
    .trim();

const mixRgb = (
  from: [number, number, number],
  to: [number, number, number],
  t: number
) =>
  [
    Math.round(lerp(from[0], to[0], t)),
    Math.round(lerp(from[1], to[1], t)),
    Math.round(lerp(from[2], to[2], t)),
  ];

const lerp = (start: number, end: number, t: number) =>
  start + (end - start) * t;
