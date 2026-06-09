import {
  FLAT_MAX,
  FLAT_MIN,
  FLAT_TYPE_OPTIONS,
  INCOME_MAX,
  INCOME_MIN,
  DEFAULT_LOAN_INTEREST_RATE,
  DEFAULT_LOAN_TENURE_YEARS,
  LOAN_INTEREST_RATE_MAX,
  LOAN_INTEREST_RATE_MIN,
  LOAN_TENURE_MIN,
  BANK_LOAN_TENURE_MAX,
} from "../constants";
import type {
  BtoScoreComponentKey,
  FinancingType,
  FlatType,
  SchemeType,
} from "../types";
import type { BtoScoreMode, BtoScorePreset } from "../types";
import {
  BTO_SCORE_MODES,
  BTO_SCORE_PRESETS,
  BTO_SCORE_PRESET_DETAILS,
  type BtoScoreWeights,
} from "./btoScoring";
import { isDateInputValue } from "./date";
import { clampNumber } from "./format";

export const PLANNER_STORAGE_KEY = "hdb-planner:saved-plan";
const PLANNER_SCHEMA_VERSION = 1;

const FINANCING_VALUES = ["hdb", "bank", "none"] satisfies FinancingType[];
const SCHEME_VALUES = ["normal", "staggered", "dia"] satisfies SchemeType[];
const FLAT_TYPE_VALUES = FLAT_TYPE_OPTIONS.map((option) => option.value);
const SCORE_WEIGHT_KEYS = [
  "affordability",
  "commute",
  "centrality",
  "wait",
  "supply",
] satisfies BtoScoreComponentKey[];

export type PlannerSnapshot = {
  version: number;
  savedAt: string;
  combinedIncome: number;
  flatPrice: number;
  flatType: FlatType;
  financing: FinancingType;
  scheme: SchemeType;
  loanTenureYears: number;
  loanInterestRate: number;
  yearFilter: string;
  townQuery: string;
  btoScoreMode: BtoScoreMode;
  btoScorePreset: BtoScorePreset;
  btoScoreWeights: BtoScoreWeights;
  selectedBtoProjectId: string | null;
  applicationMonth: string;
  completedMilestones: string[];
  confirmedMilestoneDates: Record<string, string>;
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
  const btoScorePreset = parseEnumWithDefault(
    parsed.btoScorePreset,
    BTO_SCORE_PRESETS,
    "balanced"
  );

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
    loanTenureYears: parseBoundedNumberWithDefault(
      parsed.loanTenureYears,
      LOAN_TENURE_MIN,
      BANK_LOAN_TENURE_MAX,
      DEFAULT_LOAN_TENURE_YEARS
    ),
    loanInterestRate: parseBoundedNumberWithDefault(
      parsed.loanInterestRate,
      LOAN_INTEREST_RATE_MIN,
      LOAN_INTEREST_RATE_MAX,
      DEFAULT_LOAN_INTEREST_RATE
    ),
    yearFilter:
      typeof parsed.yearFilter === "string" && parsed.yearFilter
        ? parsed.yearFilter
        : "latest",
    townQuery: typeof parsed.townQuery === "string" ? parsed.townQuery : "",
    btoScoreMode: parseEnumWithDefault(
      parsed.btoScoreMode,
      BTO_SCORE_MODES,
      "buyer-fit"
    ),
    btoScorePreset,
    btoScoreWeights: parseScoreWeights(
      parsed.btoScoreWeights,
      BTO_SCORE_PRESET_DETAILS[btoScorePreset].weights
    ),
    selectedBtoProjectId:
      typeof parsed.selectedBtoProjectId === "string"
        ? parsed.selectedBtoProjectId
        : null,
    applicationMonth: parseApplicationMonth(parsed.applicationMonth),
    completedMilestones: parseStringArray(parsed.completedMilestones),
    confirmedMilestoneDates: parseDateMap(parsed.confirmedMilestoneDates),
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

function parseEnumWithDefault<T extends string>(
  value: unknown,
  validValues: readonly T[],
  fallback: T
): T {
  return typeof value === "string" && validValues.includes(value as T)
    ? (value as T)
    : fallback;
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

function parseBoundedNumberWithDefault(
  value: unknown,
  min: number,
  max: number,
  fallback: number
) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? clampNumber(parsed, min, max) : fallback;
}

function parseStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (item): item is string => typeof item === "string" && item.length > 0
  );
}

function parseDateMap(value: unknown) {
  if (!isRecord(value)) return {};

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] =>
        typeof entry[0] === "string" &&
        typeof entry[1] === "string" &&
        entry[0].length > 0 &&
        isDateInputValue(entry[1])
    )
  );
}

function parseScoreWeights(value: unknown, fallback: BtoScoreWeights): BtoScoreWeights {
  if (!isRecord(value)) return fallback;

  const entries = SCORE_WEIGHT_KEYS.map((key) => {
    const parsed = Number(value[key]);
    return [key, parsed] as const;
  });

  if (entries.some(([, parsed]) => !Number.isFinite(parsed) || parsed < 0 || parsed > 100)) {
    return fallback;
  }

  const total = entries.reduce((sum, [, parsed]) => sum + parsed, 0);
  if (total !== 100) return fallback;

  return Object.fromEntries(entries) as BtoScoreWeights;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
