import type { BtoFlatVariant, BtoProject } from "../policies/policyConfig";
import { POLICY_CONFIG } from "../policies/policyConfig";
import type { FinancingType, FlatType, SchemeType } from "../types";
import { calculateMonthlyPayment } from "./finance";

export type RecommendationReasonTone = "good" | "watch" | "missing";

export type RecommendationReason = {
  label: string;
  value: string;
  tone: RecommendationReasonTone;
};

export type BtoRecommendation = {
  project: BtoProject;
  variant: BtoFlatVariant;
  score: number;
  monthlyPayment: number;
  monthlyPaymentShare: number;
  loanPrincipalNeeded: number;
  minCashSigning: number;
  dataConfidence: number;
  reasons: RecommendationReason[];
};

export type BtoRecommendationInput = {
  projects: BtoProject[];
  flatType: FlatType;
  combinedIncome: number;
  loanAmount: number;
  ehgGrant: number;
  financing: FinancingType;
  scheme: SchemeType;
  loanTenureYears: number;
  loanInterestRate: number;
  limit?: number;
};

export function rankBtoProjects({
  projects,
  flatType,
  combinedIncome,
  loanAmount,
  ehgGrant,
  financing,
  scheme,
  loanTenureYears,
  loanInterestRate,
  limit = 3,
}: BtoRecommendationInput): BtoRecommendation[] {
  return projects
    .map((project) => {
      const variant = project.flatVariants.find((item) => item.type === flatType);
      if (!variant) return null;

      return scoreBtoProject({
        project,
        variant,
        combinedIncome,
        loanAmount,
        ehgGrant,
        financing,
        scheme,
        loanTenureYears,
        loanInterestRate,
      });
    })
    .filter((item): item is BtoRecommendation => Boolean(item))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.variant.basePrice - b.variant.basePrice;
    })
    .slice(0, limit);
}

function scoreBtoProject({
  project,
  variant,
  combinedIncome,
  loanAmount,
  ehgGrant,
  financing,
  scheme,
  loanTenureYears,
  loanInterestRate,
}: {
  project: BtoProject;
  variant: BtoFlatVariant;
  combinedIncome: number;
  loanAmount: number;
  ehgGrant: number;
  financing: FinancingType;
  scheme: SchemeType;
  loanTenureYears: number;
  loanInterestRate: number;
}): BtoRecommendation {
  const downpaymentRule = POLICY_CONFIG.downpaymentRules[financing][scheme];
  const signingAmount = variant.basePrice * downpaymentRule.signing;
  const keyAmount = variant.basePrice * downpaymentRule.key;
  const minCashSigning = variant.basePrice * downpaymentRule.minCashSigning;
  const balanceAfterUpfront = Math.max(
    variant.basePrice - signingAmount - keyAmount - ehgGrant,
    0
  );
  const loanPrincipalNeeded = financing === "none" ? 0 : balanceAfterUpfront;
  const monthlyPayment = calculateMonthlyPayment(
    loanPrincipalNeeded,
    loanInterestRate,
    loanTenureYears
  );
  const monthlyPaymentShare =
    combinedIncome > 0 ? monthlyPayment / combinedIncome : Number.POSITIVE_INFINITY;
  const loanFitScore =
    financing === "none"
      ? balanceAfterUpfront === 0
        ? 100
        : 40
      : clampScore((loanAmount / Math.max(loanPrincipalNeeded, 1)) * 100);
  const monthlyComfortScore = scoreMonthlyComfort(monthlyPaymentShare);
  const cashRiskScore = scoreCashRisk(minCashSigning, combinedIncome);
  const dataConfidence = scoreDataConfidence(project, variant);
  const timingScore = scoreTiming(project.expectedTop);
  const score = Math.round(
    loanFitScore * 0.35 +
      monthlyComfortScore * 0.25 +
      cashRiskScore * 0.15 +
      dataConfidence * 0.15 +
      timingScore * 0.1
  );

  return {
    project,
    variant,
    score,
    monthlyPayment,
    monthlyPaymentShare,
    loanPrincipalNeeded,
    minCashSigning,
    dataConfidence,
    reasons: [
      describeLoanFit(loanFitScore, loanPrincipalNeeded, loanAmount, financing),
      describeMonthlyComfort(monthlyPaymentShare),
      describeCashRisk(minCashSigning, combinedIncome),
      describeDataConfidence(dataConfidence),
    ],
  };
}

function scoreMonthlyComfort(share: number) {
  if (!Number.isFinite(share)) return 0;
  if (share <= 0.25) return 100;
  if (share <= 0.35) return 80;
  if (share <= 0.45) return 55;
  if (share <= 0.6) return 30;
  return 10;
}

function scoreCashRisk(minCashSigning: number, combinedIncome: number) {
  if (minCashSigning <= 0) return 100;
  const monthsOfIncome =
    combinedIncome > 0 ? minCashSigning / combinedIncome : Number.POSITIVE_INFINITY;

  if (monthsOfIncome <= 1.5) return 100;
  if (monthsOfIncome <= 3) return 75;
  if (monthsOfIncome <= 6) return 45;
  return 15;
}

function scoreDataConfidence(project: BtoProject, variant: BtoFlatVariant) {
  let score = 0;
  if (Number.isFinite(variant.basePrice)) score += 40;
  if (project.expectedTop) score += 20;
  if (typeof project.totalUnits === "number") score += 15;
  if (project.nearestMrt) score += 15;
  if (project.sourceUrl) score += 10;
  return score;
}

function scoreTiming(expectedTop: string | undefined) {
  const year = expectedTop?.match(/(20)\d{2}/)?.[0];
  if (!year) return 50;

  const yearsAway = Number(year) - new Date().getFullYear();
  if (yearsAway <= 3) return 100;
  if (yearsAway <= 5) return 80;
  if (yearsAway <= 7) return 60;
  return 45;
}

function describeLoanFit(
  loanFitScore: number,
  loanPrincipalNeeded: number,
  loanAmount: number,
  financing: FinancingType
): RecommendationReason {
  if (financing === "none") {
    return {
      label: "Loan fit",
      value: loanPrincipalNeeded === 0 ? "No loan needed" : "Cash plan pressure",
      tone: loanPrincipalNeeded === 0 ? "good" : "watch",
    };
  }

  if (loanFitScore >= 100) {
    return {
      label: "Loan fit",
      value: "Estimate covers need",
      tone: "good",
    };
  }

  return {
    label: "Loan fit",
    value: `${Math.round(loanFitScore)}% covered`,
    tone: loanAmount > 0 ? "watch" : "missing",
  };
}

function describeMonthlyComfort(share: number): RecommendationReason {
  if (!Number.isFinite(share)) {
    return {
      label: "Monthly load",
      value: "Income missing",
      tone: "missing",
    };
  }

  return {
    label: "Monthly load",
    value: `${Math.round(share * 100)}% of income`,
    tone: share <= 0.35 ? "good" : "watch",
  };
}

function describeCashRisk(
  minCashSigning: number,
  combinedIncome: number
): RecommendationReason {
  if (minCashSigning <= 0) {
    return {
      label: "Cash risk",
      value: "No minimum cash",
      tone: "good",
    };
  }

  const monthsOfIncome =
    combinedIncome > 0 ? minCashSigning / combinedIncome : Number.POSITIVE_INFINITY;

  return {
    label: "Cash risk",
    value: Number.isFinite(monthsOfIncome)
      ? `${monthsOfIncome.toFixed(1)} months income`
      : "Income missing",
    tone: monthsOfIncome <= 3 ? "good" : "watch",
  };
}

function describeDataConfidence(dataConfidence: number): RecommendationReason {
  return {
    label: "Data confidence",
    value: `${dataConfidence}% complete`,
    tone: dataConfidence >= 75 ? "good" : dataConfidence >= 50 ? "watch" : "missing",
  };
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}
