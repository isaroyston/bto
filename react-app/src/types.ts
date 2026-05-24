import type { BtoFlatVariant } from "./policies/policyConfig";

export type TabKey = "overview" | "eligibility" | "grants" | "bto";
export type FinancingType = "hdb" | "bank" | "none";
export type SchemeType = "normal" | "staggered" | "dia";
export type FlatType = BtoFlatVariant["type"];

export type TimelinePayment = {
  label: string;
  total: number;
  cpfOa: number;
  cash: number;
  note?: string;
};

export type TimelineItem = {
  label: string;
  date: string;
  note: string;
  payment?: TimelinePayment;
};
