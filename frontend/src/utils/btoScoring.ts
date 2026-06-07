import type { BtoProject } from "../policies/policyConfig";
import type {
  BtoDecisionScore,
  BtoScoreComponent,
  BtoScoreComponentKey,
  BtoScoreMode,
  BtoScorePreset,
  FlatType,
} from "../types";
import { getLaunchMonthSortValue } from "./date";

type BtoScoreWeights = Record<BtoScoreComponentKey, number>;

export type BtoScoreContext = {
  flatType: FlatType;
  loanAmount: number;
  ehgGrant: number;
  cohortProjects: BtoProject[];
};

export const BTO_SCORE_MODE_OPTIONS: Array<{
  value: BtoScoreMode;
  label: string;
}> = [
  { value: "buyer-fit", label: "Buyer Fit" },
  { value: "project-quality", label: "Project Quality" },
];

export const BTO_SCORE_PRESET_OPTIONS: Array<{
  value: BtoScorePreset;
  label: string;
}> = [
  { value: "balanced", label: "Balanced" },
  { value: "budget", label: "Budget" },
  { value: "commute", label: "Commute" },
  { value: "faster-top", label: "Faster TOP" },
];

export const BTO_SCORE_MODES = BTO_SCORE_MODE_OPTIONS.map((option) => option.value);
export const BTO_SCORE_PRESETS = BTO_SCORE_PRESET_OPTIONS.map((option) => option.value);

export const BTO_SCORE_PRESET_DETAILS: Record<
  BtoScorePreset,
  {
    label: string;
    focus: string;
    weights: BtoScoreWeights;
  }
> = {
  balanced: {
    label: "Balanced",
    focus: "Good all-round shortlist for most buyers.",
    weights: {
      affordability: 30,
      commute: 18,
      centrality: 17,
      wait: 15,
      supply: 10,
      quality: 10,
    },
  },
  budget: {
    label: "Budget",
    focus: "Pushes lower price and loan + grant fit to the front.",
    weights: {
      affordability: 50,
      commute: 12,
      centrality: 12,
      wait: 10,
      supply: 8,
      quality: 8,
    },
  },
  commute: {
    label: "Commute",
    focus: "Prioritises MRT access and central station context before other tradeoffs.",
    weights: {
      affordability: 20,
      commute: 35,
      centrality: 25,
      wait: 8,
      supply: 6,
      quality: 6,
    },
  },
  "faster-top": {
    label: "Faster TOP",
    focus: "Favours projects expected to complete sooner.",
    weights: {
      affordability: 22,
      commute: 13,
      centrality: 10,
      wait: 40,
      supply: 10,
      quality: 5,
    },
  },
};

export const BTO_SCORE_COMPONENT_DETAILS: Record<
  BtoScoreComponentKey,
  {
    label: string;
    shortLabel: string;
    description: string;
  }
> = {
  affordability: {
    label: "Affordability",
    shortLabel: "Budget",
    description:
      "Buyer Fit checks selected flat price against loan + EHG estimate. Project Quality compares price and price per sqm within the launch.",
  },
  commute: {
    label: "Commute",
    shortLabel: "MRT",
    description:
      "Uses distance to the nearest listed MRT. Shorter distance scores higher, separate from station centrality.",
  },
  centrality: {
    label: "Centrality",
    shortLabel: "Place",
    description:
      "Uses generated station centrality and curated location context such as city fringe, regional centre, waterfront, or emerging estate.",
  },
  wait: {
    label: "Wait",
    shortLabel: "TOP",
    description:
      "Uses expected TOP. Earlier completion scores higher within the selected launch.",
  },
  supply: {
    label: "Supply",
    shortLabel: "Units",
    description:
      "Uses total unit count as a simple supply signal. More units score higher within the launch.",
  },
  quality: {
    label: "Project quality",
    shortLabel: "Ratings",
    description:
      "Uses BTOHQ accessibility, amenities, and affordability ratings when available.",
  },
};

export function scoreBtoProject(
  project: BtoProject,
  context: BtoScoreContext,
  mode: BtoScoreMode,
  preset: BtoScorePreset
): BtoDecisionScore {
  const weights = BTO_SCORE_PRESET_DETAILS[preset].weights;
  const components = buildComponents(project, context, mode, weights);
  const availableWeight = components.reduce((sum, component) => sum + component.weight, 0);
  const total =
    availableWeight > 0
      ? Math.round(
          components.reduce(
            (sum, component) => sum + component.score * component.weight,
            0
          ) / availableWeight
        )
      : null;
  const missingFields = getMissingFields(project, context, mode);
  const confidence = getConfidence(components.length);

  return {
    total,
    mode,
    preset,
    label: mode === "buyer-fit" ? "Fit" : "Quality",
    confidence,
    components,
    missingFields,
    reasons: buildReasons(components, total),
  };
}

export function scoreBtoProjects(
  projects: BtoProject[],
  context: Omit<BtoScoreContext, "cohortProjects">,
  mode: BtoScoreMode,
  preset: BtoScorePreset
) {
  const scoreContext = {
    ...context,
    cohortProjects: projects,
  };

  return new Map(
    projects.map((project) => [
      project.id,
      scoreBtoProject(project, scoreContext, mode, preset),
    ])
  );
}

function buildComponents(
  project: BtoProject,
  context: BtoScoreContext,
  mode: BtoScoreMode,
  weights: BtoScoreWeights
) {
  return [
    buildAffordabilityComponent(project, context, mode, weights.affordability),
    buildCommuteComponent(project, context, weights.commute),
    buildCentralityComponent(project, weights.centrality),
    buildWaitComponent(project, context, weights.wait),
    buildSupplyComponent(project, context, weights.supply),
    buildQualityComponent(project, weights.quality),
  ].filter((component): component is BtoScoreComponent => Boolean(component));
}

function buildAffordabilityComponent(
  project: BtoProject,
  context: BtoScoreContext,
  mode: BtoScoreMode,
  weight: number
): BtoScoreComponent | null {
  const variant = project.flatVariants.find((candidate) => candidate.type === context.flatType);
  if (!variant) return null;

  const cohortVariants = context.cohortProjects
    .map((candidate) =>
      candidate.flatVariants.find((variant) => variant.type === context.flatType)
    )
    .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate));
  const priceScore = lowIsBetter(
    variant.basePrice,
    cohortVariants.map((candidate) => candidate.basePrice)
  );
  const sqmScore =
    variant.pricePerSqm === undefined
      ? null
      : lowIsBetter(
          variant.pricePerSqm,
          cohortVariants
            .map((candidate) => candidate.pricePerSqm)
            .filter((value): value is number => Number.isFinite(value))
        );

  if (mode === "project-quality") {
    return {
      key: "affordability",
      label: BTO_SCORE_COMPONENT_DETAILS.affordability.label,
      score: Math.round(averageScores([priceScore, sqmScore])),
      weight,
      reason: "Lower price pressure",
    };
  }

  const estimatedBudget = context.loanAmount + context.ehgGrant;
  if (!Number.isFinite(estimatedBudget) || estimatedBudget <= 0) return null;

  const budgetRatio = variant.basePrice / estimatedBudget;
  const budgetScore =
    budgetRatio <= 1
      ? 100 - Math.min(20, (1 - budgetRatio) * 30)
      : Math.max(0, 88 - (budgetRatio - 1) * 180);

  return {
    key: "affordability",
    label: BTO_SCORE_COMPONENT_DETAILS.affordability.label,
    score: Math.round(averageScores([budgetScore, priceScore, sqmScore], [0.7, 0.2, 0.1])),
    weight,
    reason:
      budgetRatio <= 1
        ? "Within loan + grant estimate"
        : "Above loan + grant estimate",
  };
}

function buildCommuteComponent(
  project: BtoProject,
  context: BtoScoreContext,
  weight: number
): BtoScoreComponent | null {
  const distanceMeters = project.nearestMrtDistanceMeters;
  if (typeof distanceMeters !== "number" || !Number.isFinite(distanceMeters)) {
    return null;
  }

  const thresholdScore = distanceScore(distanceMeters);
  const relativeScore = lowIsBetter(
    distanceMeters,
    context.cohortProjects
      .map((candidate) => candidate.nearestMrtDistanceMeters)
      .filter((value): value is number => Number.isFinite(value))
  );

  return {
    key: "commute",
    label: BTO_SCORE_COMPONENT_DETAILS.commute.label,
    score: Math.round(averageScores([thresholdScore, relativeScore], [0.65, 0.35])),
    weight,
    reason:
      distanceMeters <= 600
        ? "Near MRT"
        : distanceMeters <= 1000
          ? "Moderate MRT walk"
          : "Longer MRT distance",
  };
}

function buildCentralityComponent(
  project: BtoProject,
  weight: number
): BtoScoreComponent | null {
  const score = project.locationSignals?.centralityScore;
  if (typeof score !== "number" || !Number.isFinite(score)) return null;

  return {
    key: "centrality",
    label: BTO_SCORE_COMPONENT_DETAILS.centrality.label,
    score,
    weight,
    reason: project.locationSignals?.centralityLabel ?? "Location context available",
  };
}

function buildWaitComponent(
  project: BtoProject,
  context: BtoScoreContext,
  weight: number
): BtoScoreComponent | null {
  const topSortValue = getLaunchMonthSortValue(project.expectedTop ?? "");
  if (!topSortValue) return null;

  const score = lowIsBetter(
    topSortValue,
    context.cohortProjects
      .map((candidate) => getLaunchMonthSortValue(candidate.expectedTop ?? ""))
      .filter((value) => value > 0)
  );

  return {
    key: "wait",
    label: BTO_SCORE_COMPONENT_DETAILS.wait.label,
    score,
    weight,
    reason: "Earlier TOP",
  };
}

function buildSupplyComponent(
  project: BtoProject,
  context: BtoScoreContext,
  weight: number
): BtoScoreComponent | null {
  const totalUnits = project.totalUnits;
  if (typeof totalUnits !== "number" || !Number.isFinite(totalUnits)) return null;

  return {
    key: "supply",
    label: BTO_SCORE_COMPONENT_DETAILS.supply.label,
    score: highIsBetter(
      totalUnits,
      context.cohortProjects
        .map((candidate) => candidate.totalUnits)
        .filter((value): value is number => Number.isFinite(value))
    ),
    weight,
    reason: "More units",
  };
}

function buildQualityComponent(project: BtoProject, weight: number): BtoScoreComponent | null {
  const ratings = project.btohq?.ratings;
  const ratingScores = [
    ratings?.accessibility,
    ratings?.amenities,
    ratings?.affordability,
  ]
    .filter((rating): rating is number => Number.isFinite(rating))
    .map((rating) => clamp((rating / 5) * 100, 0, 100));

  if (!ratingScores.length) return null;

  return {
    key: "quality",
    label: BTO_SCORE_COMPONENT_DETAILS.quality.label,
    score: Math.round(averageScores(ratingScores)),
    weight,
    reason: "BTOHQ ratings available",
  };
}

function getMissingFields(
  project: BtoProject,
  context: BtoScoreContext,
  mode: BtoScoreMode
) {
  const fields: string[] = [];
  const variant = project.flatVariants.find((candidate) => candidate.type === context.flatType);

  if (!variant) fields.push(`${context.flatType} price`);
  if (mode === "buyer-fit" && context.loanAmount + context.ehgGrant <= 0) {
    fields.push("loan + grant estimate");
  }
  if (!Number.isFinite(project.nearestMrtDistanceMeters)) fields.push("MRT distance");
  if (!Number.isFinite(project.locationSignals?.centralityScore)) {
    fields.push("location centrality");
  }
  if (!project.expectedTop) fields.push("expected TOP");
  if (!Number.isFinite(project.totalUnits)) fields.push("unit count");
  if (!project.btohq?.ratings) fields.push("BTOHQ ratings");

  return fields;
}

function buildReasons(components: BtoScoreComponent[], total: number | null) {
  if (total === null) return ["Not enough comparable data"];

  return [...components]
    .sort((a, b) => b.score * b.weight - a.score * a.weight)
    .slice(0, 2)
    .map((component) => component.reason);
}

function getConfidence(componentCount: number) {
  if (componentCount >= 4) return "Strong data";
  if (componentCount >= 3) return "Partial data";
  return "Limited data";
}

function lowIsBetter(value: number, values: number[]) {
  const range = getRange(values);
  if (!range) return 80;
  if (range.max === range.min) return 80;
  return Math.round(100 - ((value - range.min) / (range.max - range.min)) * 70);
}

function highIsBetter(value: number, values: number[]) {
  const range = getRange(values);
  if (!range) return 80;
  if (range.max === range.min) return 80;
  return Math.round(30 + ((value - range.min) / (range.max - range.min)) * 70);
}

function distanceScore(distanceMeters: number) {
  if (distanceMeters <= 400) return 100;
  if (distanceMeters <= 600) return 90;
  if (distanceMeters <= 800) return 78;
  if (distanceMeters <= 1000) return 68;
  if (distanceMeters <= 1400) return 52;
  return 35;
}

function getRange(values: number[]) {
  const validValues = values.filter((value) => Number.isFinite(value));
  if (!validValues.length) return null;

  return {
    min: Math.min(...validValues),
    max: Math.max(...validValues),
  };
}

function averageScores(values: Array<number | null>, weights?: number[]) {
  const entries = values
    .map((value, index) => ({
      value,
      weight: weights?.[index] ?? 1,
    }))
    .filter((entry): entry is { value: number; weight: number } =>
      Number.isFinite(entry.value)
    );
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);

  if (!entries.length || totalWeight <= 0) return 0;

  return (
    entries.reduce((sum, entry) => sum + entry.value * entry.weight, 0) /
    totalWeight
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
