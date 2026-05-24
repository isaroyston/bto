import type { TabKey } from "./types";

export const TABS: { id: TabKey; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "eligibility", label: "Eligibility" },
  { id: "grants", label: "Grants" },
  { id: "bto", label: "BTO Radar" },
];

export const LOAN_MULTIPLIER = 60;
export const INCOME_MIN = 1000;
export const INCOME_MAX = 15000;
export const FLAT_MIN = 350000;
export const FLAT_MAX = 1200000;
export const DEFAULT_VISIBLE_PROJECTS = 12;
export const PLANNING_AREA_GEOJSON =
  "/data/hdb/ura/planning-area-boundary.geojson";
