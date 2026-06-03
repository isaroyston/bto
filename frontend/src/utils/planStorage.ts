import {
  FLAT_MAX,
  FLAT_MIN,
  FLAT_TYPE_OPTIONS,
  INCOME_MAX,
  INCOME_MIN,
} from "../constants";
import type { FinancingType, FlatType, SchemeType } from "../types";
import { clampNumber } from "./format";

export const PLANNER_STORAGE_KEY = "hdb-planner:saved-plan";
const PLANNER_SCHEMA_VERSION = 1;

const FINANCING_VALUES = ["hdb", "bank", "none"] satisfies FinancingType[];
const SCHEME_VALUES = ["normal", "staggered", "dia"] satisfies SchemeType[];
const FLAT_TYPE_VALUES = FLAT_TYPE_OPTIONS.map((option) => option.value);

export type PlannerSnapshot = {
  version: number;
  savedAt: string;
  combinedIncome: number;
  flatPrice: number;
  flatType: FlatType;
  financing: FinancingType;
  scheme: SchemeType;
  yearFilter: string;
  townQuery: string;
  selectedBtoProjectId: string | null;
  applicationMonth: string;
  completedMilestones: string[];
};

type PlannerSnapshotInput = Omit<PlannerSnapshot, "version" | "savedAt">;

export function createPlannerSnapshot(
  input: PlannerSnapshotInput
): PlannerSnapshot {
  return {
    version: PLANNER_SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    ...input,
  };
}

export function savePlannerSnapshot(snapshot: PlannerSnapshot) {
  window.localStorage.setItem(
    PLANNER_STORAGE_KEY,
    JSON.stringify(snapshot, null, 2)
  );
}

export function loadPlannerSnapshot(): PlannerSnapshot | null {
  const raw = window.localStorage.getItem(PLANNER_STORAGE_KEY);
  if (!raw) return null;

  return parsePlannerSnapshot(raw);
}

export function parsePlannerSnapshot(raw: string): PlannerSnapshot {
  const parsed = JSON.parse(raw) as unknown;
  if (!isRecord(parsed)) {
    throw new Error("Plan file must contain a JSON object.");
  }

  const flatType = parseEnum(
    parsed.flatType,
    FLAT_TYPE_VALUES,
    "flat type"
  );
  const financing = parseEnum(
    parsed.financing,
    FINANCING_VALUES,
    "financing type"
  );
  const scheme = parseEnum(parsed.scheme, SCHEME_VALUES, "payment scheme");

  return {
    version: PLANNER_SCHEMA_VERSION,
    savedAt:
      typeof parsed.savedAt === "string"
        ? parsed.savedAt
        : new Date().toISOString(),
    combinedIncome: parseBoundedNumber(
      parsed.combinedIncome,
      INCOME_MIN,
      INCOME_MAX,
      "household income"
    ),
    flatPrice: parseBoundedNumber(
      parsed.flatPrice,
      FLAT_MIN,
      FLAT_MAX,
      "flat price"
    ),
    flatType,
    financing,
    scheme,
    yearFilter:
      typeof parsed.yearFilter === "string" && parsed.yearFilter
        ? parsed.yearFilter
        : "latest",
    townQuery: typeof parsed.townQuery === "string" ? parsed.townQuery : "",
    selectedBtoProjectId:
      typeof parsed.selectedBtoProjectId === "string"
        ? parsed.selectedBtoProjectId
        : null,
    applicationMonth: parseApplicationMonth(parsed.applicationMonth),
    completedMilestones: parseStringArray(parsed.completedMilestones),
  };
}

export function downloadPlannerSnapshot(snapshot: PlannerSnapshot) {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: "application/json",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `hdb-plan-${snapshot.savedAt.slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function parseEnum<T extends string>(
  value: unknown,
  validValues: readonly T[],
  label: string
): T {
  if (typeof value === "string" && validValues.includes(value as T)) {
    return value as T;
  }

  throw new Error(`Plan file has an unsupported ${label}.`);
}

function parseApplicationMonth(value: unknown) {
  if (typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    return value;
  }

  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
}

function parseBoundedNumber(
  value: unknown,
  min: number,
  max: number,
  label: string
) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Plan file has an invalid ${label}.`);
  }

  return clampNumber(parsed, min, max);
}

function parseStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (item): item is string => typeof item === "string" && item.length > 0
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
