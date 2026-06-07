import { useMemo, useState } from "react";
import { FLAT_TYPE_OPTIONS } from "../constants";
import type { BtoFlatVariant, BtoProject } from "../policies/policyConfig";
import { FactItem } from "./FactItem";
import type {
  BtoDecisionScore,
  BtoScoreMode,
  BtoScorePreset,
  FlatType,
} from "../types";
import {
  BTO_SCORE_MODE_OPTIONS,
  BTO_SCORE_COMPONENT_DETAILS,
  BTO_SCORE_PRESET_DETAILS,
  BTO_SCORE_PRESET_OPTIONS,
  scoreBtoProjects,
} from "../utils/btoScoring";
import { getLaunchMonthSortValue } from "../utils/date";
import { currency } from "../utils/format";
import {
  BTO_SOURCE_CREDITS,
  getBtoProjectSourceLabel,
  getBtoProjectSourceNote,
} from "../utils/sourceCredits";

type BtoTabProps = {
  btoProjects: BtoProject[];
  btoLoading: boolean;
  btoError: string | null;
  availableYears: number[];
  yearFilter: string;
  townQuery: string;
  filteredProjects: BtoProject[];
  selectedFlatType: FlatType;
  loanAmount: number;
  ehgGrant: number;
  scoreMode: BtoScoreMode;
  scorePreset: BtoScorePreset;
  selectedProjectId: string | null;
  onRetry: () => void;
  onYearFilterChange: (value: string) => void;
  onTownQueryChange: (value: string) => void;
  onFlatTypeChange: (value: FlatType) => void;
  onScoreModeChange: (value: BtoScoreMode) => void;
  onScorePresetChange: (value: BtoScorePreset) => void;
  onSelectProject: (projectId: string) => void;
  onResetFilters: () => void;
};

type LaunchGroup = {
  key: string;
  projects: BtoProject[];
  totalUnits: number;
  lowestPrice: number | null;
  pricedProjectCount: number;
  distanceProjectCount: number;
  ratingProjectCount: number;
};

type CompareRow = {
  label: string;
  values: Array<{
    projectId: string;
    value: string;
    score?: number;
  }>;
  bestProjectIds?: Set<string>;
};

const MAX_COMPARE_PROJECTS = 4;
const SCORE_COMPONENT_ORDER = [
  "affordability",
  "commute",
  "centrality",
  "wait",
  "supply",
  "quality",
] as const;

export function BtoTab({
  btoProjects,
  btoLoading,
  btoError,
  availableYears,
  yearFilter,
  townQuery,
  filteredProjects,
  selectedFlatType,
  loanAmount,
  ehgGrant,
  scoreMode,
  scorePreset,
  selectedProjectId,
  onRetry,
  onYearFilterChange,
  onTownQueryChange,
  onFlatTypeChange,
  onScoreModeChange,
  onScorePresetChange,
  onSelectProject,
  onResetFilters,
}: BtoTabProps) {
  const [activeLaunch, setActiveLaunch] = useState<string | null>(null);
  const [comparedProjectIds, setComparedProjectIds] = useState<string[]>([]);
  const [showScoreGuide, setShowScoreGuide] = useState(false);
  const [showPlanContext, setShowPlanContext] = useState(false);
  const hasActiveFilters = yearFilter !== "latest" || townQuery.trim().length > 0;
  const launchGroups = useMemo(
    () => groupProjectsByLaunch(filteredProjects, selectedFlatType),
    [filteredProjects, selectedFlatType]
  );
  const pricedProjectCount = useMemo(
    () =>
      filteredProjects.filter((project) =>
        project.flatVariants.some((variant) => variant.type === selectedFlatType)
      ).length,
    [filteredProjects, selectedFlatType]
  );
  const selectedLaunch =
    launchGroups.find((group) => group.key === activeLaunch) ?? launchGroups[0];
  const launchProjectIds = useMemo(
    () => new Set(selectedLaunch?.projects.map((project) => project.id) ?? []),
    [selectedLaunch]
  );
  const activeComparedProjectIds = useMemo(
    () => comparedProjectIds.filter((projectId) => launchProjectIds.has(projectId)),
    [comparedProjectIds, launchProjectIds]
  );

  const handleToggleCompareProject = (projectId: string) => {
    setComparedProjectIds((current) => {
      const activeCurrent = current.filter((id) => launchProjectIds.has(id));

      if (activeCurrent.includes(projectId)) {
        return activeCurrent.filter((id) => id !== projectId);
      }

      if (activeCurrent.length >= MAX_COMPARE_PROJECTS) return activeCurrent;
      return [...activeCurrent, projectId];
    });
  };

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-heritage-navy">BTO Radar</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-warm-stone">
            Browse launches, compare project facts, send one into Plan.
          </p>
        </div>
        <SourceCreditLinks />
      </header>

      {btoLoading && (
        <div className="panel p-5 text-sm text-warm-stone">
          Loading RecordBTO project data...
        </div>
      )}

      {btoError && (
        <div className="panel flex items-center justify-between gap-4 p-5 text-sm text-warm-stone">
          <span>{btoError}</span>
          <button type="button" className="btn-primary" onClick={onRetry}>
            Retry
          </button>
        </div>
      )}

      {!btoLoading && !btoError && (
        <>
          <div className="panel grid gap-4 p-4 lg:grid-cols-[180px_180px_minmax(220px,1fr)_auto] lg:items-end">
            <div>
              <label className="field-label" htmlFor="flat-type-filter">
                Price view
              </label>
              <select
                id="flat-type-filter"
                value={selectedFlatType}
                onChange={(event) => onFlatTypeChange(event.target.value as FlatType)}
                className="control mt-2 w-full"
              >
                {FLAT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="year-filter">
                Year
              </label>
              <select
                id="year-filter"
                value={yearFilter}
                onChange={(event) => onYearFilterChange(event.target.value)}
                className="control mt-2 w-full"
                disabled={availableYears.length === 0}
              >
                <option value="latest">Latest launch</option>
                <option value="all">All years</option>
                {availableYears.map((year) => (
                  <option key={year} value={String(year)}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="town-filter">
                Town
              </label>
              <input
                id="town-filter"
                type="text"
                value={townQuery}
                onChange={(event) => onTownQueryChange(event.target.value)}
                placeholder="Search by town"
                className="control mt-2 w-full"
              />
            </div>

            <div className="flex items-center justify-between gap-3 lg:justify-end">
              <span className="text-sm text-warm-stone">
                {launchGroups.length} launches, {filteredProjects.length} projects
              </span>
              {hasActiveFilters && (
                <button type="button" className="btn-secondary" onClick={onResetFilters}>
                  Reset
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <DecisionMetric
              label="Launches in view"
              value={launchGroups.length}
            />
            <DecisionMetric
              label={`${selectedFlatType} price records`}
              value={pricedProjectCount}
            />
            <DecisionMetric
              label="Projects loaded"
              value={btoProjects.length}
            />
          </div>

          <div className="panel overflow-hidden">
            <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_220px_max-content] lg:items-end">
              <div className="grid min-w-0 gap-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="field-label">Decision score</span>
                  <span className="rounded-sm bg-heritage-navy/[0.04] px-2 py-1 text-xs leading-5 text-warm-stone">
                    {scoreMode === "buyer-fit"
                      ? `Using ${currency(loanAmount + ehgGrant)} estimate`
                      : "Plan context ignored"}
                  </span>
                </div>
                <div className="scenario-segmented-control max-w-md">
                  {BTO_SCORE_MODE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={
                        scoreMode === option.value ? "scenario-segment-active" : ""
                      }
                      onClick={() => onScoreModeChange(option.value)}
                      aria-pressed={scoreMode === option.value}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="field-label" htmlFor="score-preset">
                  Priority
                </label>
                <select
                  id="score-preset"
                  value={scorePreset}
                  onChange={(event) =>
                    onScorePresetChange(event.target.value as BtoScorePreset)
                  }
                  className="control mt-2 h-10 w-full"
                >
                  {BTO_SCORE_PRESET_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <button
                  type="button"
                  className="btn-secondary h-10 whitespace-nowrap"
                  onClick={() => setShowPlanContext((current) => !current)}
                  aria-expanded={showPlanContext}
                >
                  {showPlanContext ? "Hide context" : "Plan context"}
                </button>
                <button
                  type="button"
                  className="btn-secondary h-10 whitespace-nowrap"
                  onClick={() => setShowScoreGuide((current) => !current)}
                  aria-expanded={showScoreGuide}
                >
                  {showScoreGuide ? "Hide guide" : "Score guide"}
                </button>
              </div>
            </div>

            {showPlanContext && (
              <div className="border-t border-heritage-navy/10">
                <PlanContextPanel
                  selectedFlatType={selectedFlatType}
                  loanAmount={loanAmount}
                  ehgGrant={ehgGrant}
                  scoreMode={scoreMode}
                />
              </div>
            )}

            {showScoreGuide && (
              <div className="border-t border-heritage-navy/10">
                <ScoreGuide
                  activePreset={scorePreset}
                  activeMode={scoreMode}
                />
              </div>
            )}
          </div>

          {launchGroups.length === 0 ? (
            <div className="panel p-5 text-sm text-warm-stone">
              No projects match the current filters.
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
              <div className="panel overflow-hidden">
                <div className="border-b border-heritage-navy/10 p-4">
                  <h3 className="text-base font-semibold text-heritage-navy">
                    Launch months
                  </h3>
                  <p className="mt-1 text-sm text-warm-stone">
                    Pick a launch.
                  </p>
                </div>
                <div className="divide-y divide-heritage-navy/10">
                  {launchGroups.map((group) => (
                    <LaunchButton
                      key={group.key}
                      group={group}
                      isActive={group.key === selectedLaunch?.key}
                      onClick={() => setActiveLaunch(group.key)}
                    />
                  ))}
                </div>
              </div>

              {selectedLaunch && (
                <ProjectDrilldown
                  key={selectedLaunch.key}
                  launch={selectedLaunch}
                  comparedProjectIds={activeComparedProjectIds}
                  selectedFlatType={selectedFlatType}
                  loanAmount={loanAmount}
                  ehgGrant={ehgGrant}
                  scoreMode={scoreMode}
                  scorePreset={scorePreset}
                  selectedProjectId={selectedProjectId}
                  onToggleCompareProject={handleToggleCompareProject}
                  onSelectProject={onSelectProject}
                />
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function DecisionMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="panel flex items-center justify-between gap-4 px-4 py-3">
      <span className="text-sm text-warm-stone">{label}</span>
      <span className="text-lg font-semibold text-heritage-navy">
        {value.toLocaleString("en-SG")}
      </span>
    </div>
  );
}

function PlanContextPanel({
  selectedFlatType,
  loanAmount,
  ehgGrant,
  scoreMode,
}: {
  selectedFlatType: FlatType;
  loanAmount: number;
  ehgGrant: number;
  scoreMode: BtoScoreMode;
}) {
  const estimatedRange = loanAmount + ehgGrant;

  return (
    <section className="grid gap-4 bg-futuristic-teal/[0.04] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-warm-stone">Plan context</p>
          <h3 className="mt-1 text-base font-semibold text-heritage-navy">
            Fields used by the BTO score
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-warm-stone">
            {scoreMode === "buyer-fit"
              ? "Buyer Fit compares each project against this current plan estimate."
              : "Project Quality is neutral, so these personal fields are shown for reference only."}
          </p>
        </div>
        <div className="rounded-hdb border border-futuristic-teal/30 bg-white px-3 py-2 text-sm">
          <span className="block text-xs font-medium text-warm-stone">
            Loan + grant
          </span>
          <span className="font-semibold tabular-nums text-heritage-navy">
            {currency(estimatedRange)}
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <ContextMiniFact label="Flat view" value={selectedFlatType} />
        <ContextMiniFact label="Estimated loan" value={currency(loanAmount)} />
        <ContextMiniFact label="EHG grant" value={currency(ehgGrant)} />
        <ContextMiniFact label="Score mode" value={scoreMode === "buyer-fit" ? "Buyer Fit" : "Project Quality"} />
      </div>
    </section>
  );
}

function ContextMiniFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-hdb border border-heritage-navy/10 bg-white px-3 py-2">
      <p className="text-xs text-warm-stone">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-heritage-navy" title={value}>
        {value}
      </p>
    </div>
  );
}

function ScoreGuide({
  activePreset,
  activeMode,
}: {
  activePreset: BtoScorePreset;
  activeMode: BtoScoreMode;
}) {
  return (
    <section>
      <div className="grid gap-5 border-b border-heritage-navy/10 bg-heritage-navy/[0.02] p-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div>
          <p className="text-xs font-semibold text-warm-stone">Score guide</p>
          <h3 className="mt-1 text-lg font-semibold text-heritage-navy">
            How projects are ranked
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-warm-stone">
            Scores are launch-relative. Missing metrics are removed from the
            calculation and the remaining weights are normalised, so a project is
            not punished for data that the source has not published.
          </p>
        </div>
        <div className="grid gap-2 text-sm">
          <LegendLine
            label="Buyer Fit"
            value="Adds your loan + EHG estimate to the same project facts."
            isActive={activeMode === "buyer-fit"}
          />
          <LegendLine
            label="Project Quality"
            value="Ignores household income and ranks the launch neutrally."
            isActive={activeMode === "project-quality"}
          />
        </div>
      </div>

      <div className="grid gap-6 p-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.8fr)]">
        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-4">
            <h4 className="text-sm font-semibold text-heritage-navy">
              Weight presets
            </h4>
            <span className="text-xs text-warm-stone">
              Active: {BTO_SCORE_PRESET_DETAILS[activePreset].label}
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {BTO_SCORE_PRESET_OPTIONS.map((option) => {
              const preset = BTO_SCORE_PRESET_DETAILS[option.value];

              return (
                <div
                  key={option.value}
                  className={`border-t pt-3 ${
                    option.value === activePreset
                      ? "border-futuristic-teal"
                      : "border-heritage-navy/10"
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-heritage-navy">
                        {preset.label}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-warm-stone">
                        {preset.focus}
                      </p>
                    </div>
                    {option.value === activePreset && (
                      <span className="rounded-sm bg-good-soft px-2 py-0.5 text-xs font-semibold text-good">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="grid gap-2">
                    {SCORE_COMPONENT_ORDER.map((component) => (
                      <WeightBar
                        key={component}
                        label={BTO_SCORE_COMPONENT_DETAILS[component].shortLabel}
                        weight={preset.weights[component]}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-heritage-navy">
            Metrics and confidence
          </h4>
          <div className="mt-3 divide-y divide-heritage-navy/10 border-y border-heritage-navy/10">
            {SCORE_COMPONENT_ORDER.map((component) => {
              const detail = BTO_SCORE_COMPONENT_DETAILS[component];

              return (
                <div key={component} className="grid gap-1 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-heritage-navy">
                      {detail.label}
                    </p>
                    <span className="text-xs font-medium text-warm-stone">
                      {detail.shortLabel}
                    </span>
                  </div>
                  <p className="text-xs leading-5 text-warm-stone">
                    {detail.description}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="mt-4 grid gap-2 text-xs leading-5 text-warm-stone">
            <LegendLine label="Strong data" value="4 or more score components available." />
            <LegendLine label="Partial data" value="3 score components available." />
            <LegendLine label="Limited data" value="Fewer than 3 components available." />
          </div>
        </div>
      </div>
    </section>
  );
}

function WeightBar({ label, weight }: { label: string; weight: number }) {
  return (
    <div className="grid grid-cols-[72px_minmax(0,1fr)_36px] items-center gap-2">
      <span className="text-xs font-medium text-warm-stone">{label}</span>
      <span
        className="h-2 overflow-hidden rounded-full bg-heritage-navy/10"
        aria-hidden="true"
      >
        <span
          className="block h-full rounded-full bg-futuristic-teal"
          style={{ width: `${weight}%` }}
        />
      </span>
      <span className="text-right text-xs font-semibold text-heritage-navy">
        {weight}
      </span>
    </div>
  );
}

function LegendLine({
  label,
  value,
  isActive = false,
}: {
  label: string;
  value: string;
  isActive?: boolean;
}) {
  return (
    <div
      className={`grid gap-1 rounded-sm border px-3 py-2 ${
        isActive
          ? "border-futuristic-teal bg-futuristic-teal/[0.06]"
          : "border-heritage-navy/10 bg-white"
      }`}
    >
      <span className="font-semibold text-heritage-navy">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function LaunchButton({
  group,
  isActive,
  onClick,
}: {
  group: LaunchGroup;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`grid w-full gap-2 p-4 text-left transition-colors duration-200 ${
        isActive
          ? "bg-heritage-navy/[0.05]"
          : "bg-white hover:bg-heritage-navy/[0.025]"
      }`}
      title={`Show projects launched in ${group.key}`}
      onClick={onClick}
      aria-pressed={isActive}
    >
      <span className="flex items-start justify-between gap-4">
        <span className="font-semibold text-heritage-navy">{group.key}</span>
        <span className="text-sm text-warm-stone">
          {group.projects.length} {group.projects.length === 1 ? "project" : "projects"}
        </span>
      </span>
      <span className="flex justify-end text-sm text-warm-stone">
        <span>{formatNumber(group.totalUnits)} units</span>
      </span>
      <span className="text-sm text-heritage-navy">
        {group.lowestPrice
          ? `From ${currency(group.lowestPrice)}`
          : "Price not listed"}
      </span>
      <span className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-warm-stone">
        <span>{group.pricedProjectCount}/{group.projects.length} priced</span>
        <span>{group.distanceProjectCount}/{group.projects.length} MRT estimates</span>
        <span>{group.ratingProjectCount}/{group.projects.length} ratings</span>
      </span>
    </button>
  );
}

function ProjectDrilldown({
  launch,
  comparedProjectIds,
  selectedFlatType,
  loanAmount,
  ehgGrant,
  scoreMode,
  scorePreset,
  selectedProjectId,
  onToggleCompareProject,
  onSelectProject,
}: {
  launch: LaunchGroup;
  comparedProjectIds: string[];
  selectedFlatType: FlatType;
  loanAmount: number;
  ehgGrant: number;
  scoreMode: BtoScoreMode;
  scorePreset: BtoScorePreset;
  selectedProjectId: string | null;
  onToggleCompareProject: (projectId: string) => void;
  onSelectProject: (projectId: string) => void;
}) {
  const comparedProjects = comparedProjectIds
    .map((projectId) => launch.projects.find((project) => project.id === projectId))
    .filter((project): project is BtoProject => Boolean(project));
  const projectScores = useMemo(
    () =>
      scoreBtoProjects(
        launch.projects,
        {
          flatType: selectedFlatType,
          loanAmount,
          ehgGrant,
        },
        scoreMode,
        scorePreset
      ),
    [ehgGrant, launch.projects, loanAmount, scoreMode, scorePreset, selectedFlatType]
  );

  return (
    <div className="panel bto-reveal overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-heritage-navy/10 p-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-base font-semibold text-heritage-navy">
            {launch.key}
          </h3>
          <p className="mt-1 text-sm text-warm-stone">
            Send a project to Plan to anchor price, launch month, and TOP.
          </p>
        </div>
        <div className="text-sm text-warm-stone">
          {launch.projects.length} projects, {formatNumber(launch.totalUnits)} units
        </div>
      </div>

      <CompareTray
        projects={comparedProjects}
        selectedFlatType={selectedFlatType}
        scores={projectScores}
      />

      <div className="grid gap-3 p-4 md:grid-cols-2">
        {launch.projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            selectedFlatType={selectedFlatType}
            decisionScore={projectScores.get(project.id) ?? null}
            isSelected={project.id === selectedProjectId}
            isCompareSelected={comparedProjectIds.includes(project.id)}
            isCompareDisabled={
              comparedProjectIds.length >= MAX_COMPARE_PROJECTS &&
              !comparedProjectIds.includes(project.id)
            }
            compareCount={comparedProjectIds.length}
            onToggleCompareProject={onToggleCompareProject}
            onSelectProject={onSelectProject}
          />
        ))}
      </div>
    </div>
  );
}

function ProjectCard({
  project,
  selectedFlatType,
  decisionScore,
  isSelected,
  isCompareSelected,
  isCompareDisabled,
  compareCount,
  onToggleCompareProject,
  onSelectProject,
}: {
  project: BtoProject;
  selectedFlatType: FlatType;
  decisionScore: BtoDecisionScore | null;
  isSelected: boolean;
  isCompareSelected: boolean;
  isCompareDisabled: boolean;
  compareCount: number;
  onToggleCompareProject: (projectId: string) => void;
  onSelectProject: (projectId: string) => void;
}) {
  const selectedVariant = getSelectedVariant(project, selectedFlatType);
  const downpayment = selectedVariant ? selectedVariant.basePrice * 0.1 : null;

  return (
    <article
      className={`grid h-full content-start gap-4 rounded-hdb border p-4 transition-colors duration-200 ${
        isSelected
          ? "border-heritage-navy/30 bg-heritage-navy/[0.04]"
          : "border-heritage-navy/10 bg-white hover:border-heritage-navy/20"
      }`}
    >
      <div className="grid gap-4 sm:min-h-[4.75rem] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="grid min-w-0 content-start gap-1">
          <div className="min-h-10">
            {project.sourceUrl ? (
              <a
                href={project.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="project-card-title font-semibold text-heritage-navy hover:text-futuristic-teal"
              >
                {project.name}
              </a>
            ) : (
              <h4 className="project-card-title font-semibold text-heritage-navy">
                {project.name}
              </h4>
            )}
          </div>
          <div className="min-h-5">
            <ProjectTypeBadge type={project.btoType} />
          </div>
          <p className="min-h-5 text-sm text-warm-stone">{project.location}</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <button
            type="button"
            className={`inline-flex min-h-9 min-w-[98px] shrink-0 items-center justify-center whitespace-nowrap px-3 py-1.5 ${
              isSelected ? "btn-primary" : "btn-secondary"
            }`}
            title="Use this project in your payment plan"
            onClick={() => onSelectProject(project.id)}
          >
            {isSelected ? "Selected" : "Use in Plan"}
          </button>
          <button
            type="button"
            className={`inline-flex min-h-9 min-w-[98px] shrink-0 items-center justify-center whitespace-nowrap px-3 py-1.5 ${
              isCompareSelected ? "btn-primary" : "btn-secondary"
            }`}
            title={
              isCompareDisabled
                ? "Remove a project before adding another comparison"
                : "Add this project to the comparison table"
            }
            disabled={isCompareDisabled}
            aria-pressed={isCompareSelected}
            onClick={() => onToggleCompareProject(project.id)}
          >
            {isCompareSelected ? "Comparing" : `Compare ${compareCount}/4`}
          </button>
        </div>
      </div>

      <DecisionScorePanel score={decisionScore} />

      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <FactItem
          label={`${selectedFlatType} price`}
          value={formatPrice(selectedVariant, selectedFlatType)}
        />
        <FactItem
          label="Cash at signing"
          value={downpayment ? currency(downpayment) : "Not listed"}
        />
        <FactItem
          label="Expected TOP"
          value={project.expectedTop ?? "Not listed"}
        />
        <FactItem
          label="Units"
          value={formatNumber(project.totalUnits)}
        />
        <FactItem label="Flat sizes" value={formatFlatSizes(project)} />
        <FactItem label="Nearest MRT" value={formatNearestMrt(project)} />
        <FactItem label="Location context" value={formatLocationContext(project)} />
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-warm-stone">
        <span>Wait: {project.waitTimeMonths ?? "Not listed"}</span>
        <span>{getBtoProjectSourceNote(project)}</span>
      </div>

      <div className="project-source-credit">
        {project.sourceUrl ? (
          <a href={project.sourceUrl} target="_blank" rel="noreferrer">
            Source: {getBtoProjectSourceLabel(project)}
          </a>
        ) : (
          <span>Source: {getBtoProjectSourceLabel(project)}</span>
        )}
      </div>
    </article>
  );
}

function DecisionScorePanel({ score }: { score: BtoDecisionScore | null }) {
  if (!score) return null;

  const title = score.mode === "buyer-fit" ? "Buyer Fit" : "Project Quality";
  const reasons = score.reasons.length
    ? score.reasons.slice(0, 2)
    : ["Not enough comparable data"];
  const componentByKey = new Map(score.components.map((component) => [component.key, component]));

  return (
    <div className="grid min-h-[13.5rem] content-start gap-3 rounded-hdb border border-heritage-navy/10 bg-heritage-navy/[0.025] p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-warm-stone">Decision score</p>
          <p className="mt-1 text-sm font-semibold text-heritage-navy">{title}</p>
        </div>
        <div className="sm:text-right">
          <p className="text-2xl font-semibold tabular-nums text-heritage-navy">
            {formatDecisionScoreValue(score)}
          </p>
          <p className="text-xs font-medium text-warm-stone">{score.confidence}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {reasons.map((reason) => (
          <span
            key={reason}
            className="rounded-sm border border-heritage-navy/10 bg-white px-2 py-1 text-xs font-medium text-heritage-navy"
          >
            {reason}
          </span>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {SCORE_COMPONENT_ORDER.map((componentKey) => (
          <ScoreComponentMeter
            key={componentKey}
            component={componentByKey.get(componentKey) ?? null}
            label={BTO_SCORE_COMPONENT_DETAILS[componentKey].label}
          />
        ))}
      </div>
    </div>
  );
}

function ScoreComponentMeter({
  component,
  label,
}: {
  component: BtoDecisionScore["components"][number] | null;
  label: string;
}) {
  const score = component?.score;
  const hasScore = typeof score === "number" && Number.isFinite(score);

  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-medium text-warm-stone">{label}</span>
        <span
          className={`font-semibold tabular-nums ${
            hasScore ? "text-heritage-navy" : "text-warm-stone/70"
          }`}
        >
          {hasScore ? score : "Not listed"}
        </span>
      </div>
      <span
        className="h-1.5 overflow-hidden rounded-full bg-heritage-navy/10"
        aria-hidden="true"
      >
        {hasScore && (
          <span
            className="block h-full rounded-full bg-futuristic-teal"
            style={{ width: `${score}%` }}
          />
        )}
      </span>
    </div>
  );
}

function CompareTray({
  projects,
  selectedFlatType,
  scores,
}: {
  projects: BtoProject[];
  selectedFlatType: FlatType;
  scores: Map<string, BtoDecisionScore>;
}) {
  if (projects.length < 2) {
    return (
      <div className="border-b border-heritage-navy/10 px-4 py-3 text-sm text-warm-stone">
        Select 2 to 4 projects in this launch to compare them side by side.
      </div>
    );
  }

  const rows = buildCompareRows(projects, selectedFlatType, scores);

  return (
    <div className="border-b border-heritage-navy/10 p-4">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h4 className="text-sm font-semibold text-heritage-navy">
            Project comparison
          </h4>
          <p className="text-xs leading-5 text-warm-stone">
            Shows the fields available for the selected projects.
          </p>
        </div>
        <span className="text-xs text-warm-stone">
          {projects.length}/{MAX_COMPARE_PROJECTS} selected
        </span>
      </div>

      <div className="overflow-x-auto rounded-hdb border border-heritage-navy/10">
        <table className="min-w-[760px] w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-heritage-navy/[0.04]">
              <th className="w-40 px-3 py-2 text-xs font-semibold text-warm-stone">
                Metric
              </th>
              {projects.map((project) => (
                <th
                  key={project.id}
                  className="min-w-40 px-3 py-2 text-xs font-semibold text-heritage-navy"
                >
                  <span className="block">{project.name}</span>
                  <span className="block font-normal text-warm-stone">
                    {project.location}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-heritage-navy/10">
            {rows.map((row) => (
              <tr key={row.label}>
                <th className="bg-white px-3 py-2 text-xs font-semibold text-warm-stone">
                  {row.label}
                </th>
                {row.values.map((cell) => {
                  const isBest = row.bestProjectIds?.has(cell.projectId) ?? false;

                  return (
                    <td
                      key={cell.projectId}
                      className={`px-3 py-2 align-top text-heritage-navy ${
                        isBest ? "bg-good-soft font-semibold text-good" : "bg-white"
                      }`}
                    >
                      {cell.value}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function buildCompareRows(
  projects: BtoProject[],
  selectedFlatType: FlatType,
  scores: Map<string, BtoDecisionScore>
): CompareRow[] {
  return [
    plainCompareRow({
      label: "Decision score",
      projects,
      format: (project) => formatDecisionScoreValue(scores.get(project.id) ?? null),
    }),
    plainCompareRow({
      label: "Score notes",
      projects,
      format: (project) => formatDecisionReasons(scores.get(project.id) ?? null),
    }),
    numericCompareRow({
      label: `${selectedFlatType} price`,
      projects,
      direction: "low",
      getScore: (project) => getSelectedVariant(project, selectedFlatType)?.basePrice,
      format: (value, project) =>
        value === undefined
          ? `No ${selectedFlatType} price`
          : formatPrice(getSelectedVariant(project, selectedFlatType), selectedFlatType),
    }),
    numericCompareRow({
      label: "Price per sqm",
      projects,
      direction: "low",
      getScore: (project) => getSelectedVariant(project, selectedFlatType)?.pricePerSqm,
      format: (value) => (value === undefined ? "Not listed" : `${currency(value)}/sqm`),
    }),
    numericCompareRow({
      label: "Cash at signing",
      projects,
      direction: "low",
      getScore: (project) => {
        const variant = getSelectedVariant(project, selectedFlatType);
        return variant ? variant.basePrice * 0.1 : undefined;
      },
      format: (value) => (value === undefined ? "Not listed" : currency(value)),
    }),
    plainCompareRow({
      label: "Expected TOP",
      projects,
      format: (project) => project.expectedTop ?? "Not listed",
    }),
    plainCompareRow({
      label: "Wait time",
      projects,
      format: (project) => project.waitTimeMonths ?? "Not listed",
    }),
    numericCompareRow({
      label: "Units",
      projects,
      direction: "high",
      getScore: (project) => project.totalUnits,
      format: (value) => (value === undefined ? "Not listed" : formatNumber(value)),
    }),
    plainCompareRow({
      label: "BTO type",
      projects,
      format: (project) => formatProjectType(project.btoType),
    }),
    numericCompareRow({
      label: "MRT distance",
      projects,
      direction: "low",
      getScore: (project) => project.nearestMrtDistanceMeters,
      format: (_value, project) => formatNearestMrt(project),
    }),
    plainCompareRow({
      label: "Centrality",
      projects,
      format: formatCentrality,
    }),
    plainCompareRow({
      label: "Location context",
      projects,
      format: formatLocationContext,
    }),
    numericCompareRow({
      label: "Accessibility",
      projects,
      direction: "high",
      getScore: (project) => project.btohq?.ratings?.accessibility,
      format: (value) => formatRating(value),
    }),
    numericCompareRow({
      label: "Amenities rating",
      projects,
      direction: "high",
      getScore: (project) => project.btohq?.ratings?.amenities,
      format: (value) => formatRating(value),
    }),
    numericCompareRow({
      label: "Affordability",
      projects,
      direction: "high",
      getScore: (project) => project.btohq?.ratings?.affordability,
      format: (value) => formatRating(value),
    }),
    plainCompareRow({
      label: "Nearby amenities",
      projects,
      format: formatAmenities,
    }),
  ].filter(hasAnyListedValue);
}

function numericCompareRow({
  label,
  projects,
  direction,
  getScore,
  format,
}: {
  label: string;
  projects: BtoProject[];
  direction: "low" | "high";
  getScore: (project: BtoProject) => number | undefined;
  format: (value: number | undefined, project: BtoProject) => string;
}): CompareRow {
  const values = projects.map((project) => ({
    projectId: project.id,
    score: getScore(project),
    value: format(getScore(project), project),
  }));
  const scores = values
    .map((cell) => cell.score)
    .filter((score): score is number => Number.isFinite(score));
  const bestScore = scores.length
    ? direction === "low"
      ? Math.min(...scores)
      : Math.max(...scores)
    : undefined;

  return {
    label,
    values,
    bestProjectIds:
      bestScore === undefined
        ? undefined
        : new Set(
            values
              .filter((cell) => cell.score === bestScore)
              .map((cell) => cell.projectId)
          ),
  };
}

function plainCompareRow({
  label,
  projects,
  format,
}: {
  label: string;
  projects: BtoProject[];
  format: (project: BtoProject) => string;
}): CompareRow {
  return {
    label,
    values: projects.map((project) => ({
      projectId: project.id,
      value: format(project),
    })),
  };
}

function SourceCreditLinks() {
  return (
    <div className="source-credit-row" aria-label="BTO data credits">
      <span>Data credits</span>
      {BTO_SOURCE_CREDITS.map((source) => (
        <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
          {source.label}
        </a>
      ))}
    </div>
  );
}

function groupProjectsByLaunch(projects: BtoProject[], flatType: FlatType) {
  const groups = new Map<string, BtoProject[]>();

  projects.forEach((project) => {
    const key = project.launchMonth || "Launch date not listed";
    groups.set(key, [...(groups.get(key) ?? []), project]);
  });

  return Array.from(groups.entries())
    .map(([key, launchProjects]) => {
      const variants = launchProjects
        .map((project) => getSelectedVariant(project, flatType))
        .filter((variant): variant is BtoFlatVariant => Boolean(variant));
      const prices = variants.map((variant) => variant.basePrice);
      const totalUnits = launchProjects.reduce(
        (sum, project) => sum + (project.totalUnits ?? 0),
        0
      );
      const distanceProjectCount = launchProjects.filter((project) =>
        Number.isFinite(project.nearestMrtDistanceMeters)
      ).length;
      const ratingProjectCount = launchProjects.filter((project) =>
        Boolean(project.btohq?.ratings)
      ).length;

      return {
        key,
        projects: [...launchProjects].sort(sortProjectsForLaunch(flatType)),
        totalUnits,
        lowestPrice: prices.length ? Math.min(...prices) : null,
        pricedProjectCount: variants.length,
        distanceProjectCount,
        ratingProjectCount,
      };
    })
    .sort((a, b) => getLaunchMonthSortValue(b.key) - getLaunchMonthSortValue(a.key));
}

function hasAnyListedValue(row: CompareRow) {
  return row.values.some(
    (cell) => cell.value !== "Not listed" && !cell.value.startsWith("No ")
  );
}

function sortProjectsForLaunch(flatType: FlatType) {
  return (a: BtoProject, b: BtoProject) => {
    const variantA = getSelectedVariant(a, flatType);
    const variantB = getSelectedVariant(b, flatType);

    if (variantA && variantB && variantA.basePrice !== variantB.basePrice) {
      return variantA.basePrice - variantB.basePrice;
    }
    if (variantA && !variantB) return -1;
    if (!variantA && variantB) return 1;

    const townA = (a.location || a.district || "").toLowerCase();
    const townB = (b.location || b.district || "").toLowerCase();
    if (townA !== townB) return townA.localeCompare(townB);
    return a.name.localeCompare(b.name);
  };
}

function formatPrice(variant: BtoFlatVariant | undefined, flatType: FlatType) {
  if (!variant) return `No ${flatType} price`;
  const pricePerSqm = variant.pricePerSqm
    ? variant.pricePerSqm
    : variant.floorAreaSqm
      ? variant.basePrice / variant.floorAreaSqm
      : null;
  const area = variant.floorAreaSqm && pricePerSqm
    ? `, ${variant.floorAreaSqm} sqm, ${currency(pricePerSqm)}/sqm`
    : "";
  return `${currency(variant.basePrice)}${area}`;
}

function getSelectedVariant(project: BtoProject, flatType: FlatType) {
  return project.flatVariants.find((variant) => variant.type === flatType);
}

function formatFlatSizes(project: BtoProject) {
  if (project.flatVariants.length > 0) {
    return project.flatVariants.map((variant) => variant.type).join(", ");
  }

  if (project.availableFlatTypes?.length) {
    return project.availableFlatTypes.join(", ");
  }

  return project.unitTypes ?? "Not listed";
}

function formatProjectType(type: string | undefined) {
  if (!type) return "Not listed";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function formatNearestMrt(project: BtoProject) {
  const station = project.nearestMrt ?? "Not listed";
  if (!project.nearestMrtDistanceMeters) return station;

  return `${station}, ${formatDistance(project.nearestMrtDistanceMeters)} est.`;
}

function formatDistance(distanceMeters: number) {
  if (distanceMeters >= 1000) return `${(distanceMeters / 1000).toFixed(1)} km`;
  return `${Math.round(distanceMeters / 10) * 10} m`;
}

function formatRating(value: number | undefined) {
  return Number.isFinite(value) ? `${value}/5` : "Not listed";
}

function formatAmenities(project: BtoProject) {
  const amenities = Object.values(project.btohq?.nearbyAmenities ?? {})
    .filter(Boolean)
    .slice(0, 3);

  return amenities.length ? amenities.join(", ") : "Not listed";
}

function formatCentrality(project: BtoProject) {
  const score = project.locationSignals?.centralityScore;
  const label = project.locationSignals?.centralityLabel;
  if (!Number.isFinite(score)) return label ?? "Not listed";
  return label ? `${score}/100, ${label}` : `${score}/100`;
}

function formatLocationContext(project: BtoProject) {
  const tags = project.locationSignals?.contextTags ?? [];
  if (tags.length) return tags.join(", ");
  return project.locationSignals?.centralityLabel ?? "Not listed";
}

function formatDecisionScoreValue(score: BtoDecisionScore | null) {
  if (!score || score.total === null) return "Not enough data";
  return `${score.total}/100`;
}

function formatDecisionReasons(score: BtoDecisionScore | null) {
  if (!score) return "Not listed";

  const reasons = score.reasons.length
    ? score.reasons.join(", ")
    : "Not enough comparable data";
  const missing =
    score.missingFields.length > 0
      ? `; missing ${score.missingFields.slice(0, 2).join(", ")}`
      : "";

  return `${score.confidence}: ${reasons}${missing}`;
}

function ProjectTypeBadge({ type }: { type: string | undefined }) {
  if (!type) return null;
  const lower = type.toLowerCase();
  
  let layout = "project-type-badge-default";
  if (lower === "prime") layout = "project-type-badge-prime";
  else if (lower === "plus") layout = "project-type-badge-plus";
  else if (lower === "standard") layout = "project-type-badge-standard";
  
  return (
    <span className={`project-type-badge ${layout}`}>
      {formatProjectType(type)}
    </span>
  );
}

function formatNumber(value: number | undefined) {
  return typeof value === "number" ? value.toLocaleString("en-SG") : "Not listed";
}
