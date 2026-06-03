import type { FlatType, TabKey } from "./types";

export const TABS: { id: TabKey; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "plan", label: "Plan" },
  { id: "bto", label: "BTO Radar" },
];

export const LOAN_MULTIPLIER = 60;
export const INCOME_MIN = 1000;
export const INCOME_MAX = 15000;
export const FLAT_MIN = 100000;
export const FLAT_MAX = 1200000;

export const FLAT_TYPE_OPTIONS: { value: FlatType; label: string }[] = [
  { value: "2-room", label: "2-room" },
  { value: "3-room", label: "3-room" },
  { value: "4-room", label: "4-room" },
  { value: "5-room", label: "5-room" },
  { value: "executive", label: "Executive" },
];
