import { useId, useMemo, useState } from "react";
import { FLAT_TYPE_OPTIONS } from "../constants";
import type { BtoFlatVariant, BtoProject } from "../policies/policyConfig";
import type {
  BtoDecisionScore,
  BtoScorePreset,
  FlatType,
} from "../types";
import {
  BTO_SCORE_COMPONENT_DETAILS,
  BTO_SCORE_PRESET_DETAILS,
  BTO_SCORE_PRESET_OPTIONS,
  scoreBtoProjects,
  type BtoScoreWeights,
} from "../utils/btoScoring";
import { getLaunchMonthSortValue } from "../utils/date";
import { currency } from "../utils/format";
import {
  BTO_SOURCE_CREDITS,
  getBtoProjectSourceLabel,
  getBtoProjectSourceNote,
} from "../utils/sourceCredits";
import { Icon, PageHeader, Pill, type IconName } from "./DashboardUi";

type BtoTabProps = {
  btoLoading: boolean;
  btoError: string | null;
  availableYears: number[];
  yearFilter: string;
  townQuery: string;
  filteredProjects: BtoProject[];
  selectedFlatType: FlatType;
  loanAmount: number;
  ehgGrant: number;
  totalAffordability: number;
  scorePreset: BtoScorePreset;
  scoreWeights: BtoScoreWeights;
  selectedProjectId: string | null;
  onRetry: () => void;
  onYearFilterChange: (value: string) => void;
  onTownQueryChange: (value: string) => void;
  onFlatTypeChange: (value: FlatType) => void;
  onScorePresetChange: (value: BtoScorePreset) => void;
  onScoreWeightsChange: (value: BtoScoreWeights) => void;
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
  "centrality",
  "commute",
  "wait",
  "supply",
] as const;

const SCORE_COMPONENT_ICONS: Record<
  (typeof SCORE_COMPONENT_ORDER)[number],
  IconName
> = {
  affordability: "wallet",
  centrality: "chart",
  commute: "metro",
  wait: "clock",
  supply: "cube",
};

export function BtoTab({
  btoLoading,
  btoError,
  availableYears,
  yearFilter,
  townQuery,
  filteredProjects,
  selectedFlatType,
  loanAmount,
  ehgGrant,
  totalAffordability,
  scorePreset,
  scoreWeights,
  selectedProjectId,
  onRetry,
  onYearFilterChange,
  onTownQueryChange,
  onFlatTypeChange,
  onScorePresetChange,
  onScoreWeightsChange,
  onSelectProject,
  onResetFilters,
}: BtoTabProps) {
  const [activeLaunch, setActiveLaunch] = useState<string | null>(null);
  const [comparedProjectIds, setComparedProjectIds] = useState<string[]>([]);
  const hasActiveFilters = yearFilter !== "latest" || townQuery.trim().length > 0;
  const launchGroups = useMemo(
    () => groupProjectsByLaunch(filteredProjects, selectedFlatType, loanAmount, ehgGrant, totalAffordability, scorePreset, scoreWeights),
    [filteredProjects, selectedFlatType, loanAmount, ehgGrant, totalAffordability, scorePreset, scoreWeights]
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
    <section className="dashboard-page bto-dashboard">
      <PageHeader
        title="BTO Radar"
        subtitle="Discover and compare BTO projects based on what matters to you."
        action={
          <div className="bto-header-actions">
            <SourceCreditLinks />
          </div>
        }
      />

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
          <div className="panel bto-filter-panel">
            <div className="bto-filter-fields">
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
              <span className="bto-filter-count">
                {launchGroups.length} launches, {filteredProjects.length} projects,
                {" "}
                {pricedProjectCount} priced
              </span>
              {hasActiveFilters && (
                <button type="button" className="btn-secondary" onClick={onResetFilters}>
                  Reset
                </button>
              )}
            </div>
            </div>
            <div className="active-filter-row">
              <span>Active filters:</span>
              <Pill tone="blue">
                {FLAT_TYPE_OPTIONS.find((option) => option.value === selectedFlatType)?.label ??
                  selectedFlatType}
              </Pill>
              {townQuery.trim() && <Pill tone="blue">{townQuery.trim()}</Pill>}
              {hasActiveFilters && (
                <button type="button" onClick={onResetFilters}>
                  Clear all
                </button>
              )}
            </div>
          </div>

          {launchGroups.length === 0 ? (
            <div className="panel p-5 text-sm text-warm-stone">
              No projects match the current filters.
            </div>
          ) : (
            <div className="bto-results-layout">
              <div className="panel overflow-hidden">
                <div className="border-b border-heritage-navy/10 p-4">
                  <h3 className="text-base font-semibold text-heritage-navy">
                    Launches
                  </h3>
                </div>
                <div className="launch-list-grid">
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
                  totalAffordability={totalAffordability}
                  scorePreset={scorePreset}
                  scoreWeights={scoreWeights}
                  onScorePresetChange={onScorePresetChange}
                  onScoreWeightsChange={onScoreWeightsChange}
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
      className={`launch-list-button ${
        isActive
          ? "launch-list-button-active"
          : "launch-list-button-idle"
      }`}
      title={`Show projects launched in ${group.key}`}
      onClick={onClick}
      aria-pressed={isActive}
    >
      <span className="launch-list-main">
        <strong>{group.key}</strong>
        <span>
          {group.projects.length} {group.projects.length === 1 ? "project" : "projects"}
        </span>
      </span>
      <span className="launch-list-price">
        {group.lowestPrice
          ? `From ${currency(group.lowestPrice)}`
          : "Price not listed"}
      </span>
      <span className="launch-list-meta">
        <span>{formatNumber(group.totalUnits)} units</span>
        <span>{group.pricedProjectCount}/{group.projects.length} priced</span>
        <span>{group.distanceProjectCount}/{group.projects.length} MRT</span>
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
  totalAffordability,
  scorePreset,
  scoreWeights,
  onScorePresetChange,
  onScoreWeightsChange,
  selectedProjectId,
  onToggleCompareProject,
  onSelectProject,
}: {
  launch: LaunchGroup;
  comparedProjectIds: string[];
  selectedFlatType: FlatType;
  loanAmount: number;
  ehgGrant: number;
  totalAffordability: number;
  scorePreset: BtoScorePreset;
  scoreWeights: BtoScoreWeights;
  onScorePresetChange: (value: BtoScorePreset) => void;
  onScoreWeightsChange: (value: BtoScoreWeights) => void;
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
          totalAffordability,
        },
        "buyer-fit",
        scorePreset,
        scoreWeights
      ),
    [
      ehgGrant,
      launch.projects,
      loanAmount,
      totalAffordability,
      scorePreset,
      scoreWeights,
      selectedFlatType,
    ]
  );

  return (
    <div className="bto-launch-content bto-reveal">
      <div className="panel overflow-hidden">
        <div className="project-list-head">
          <div>
            <h3>{launch.key}</h3>
            <p>Choose one for Plan, or compare 2 to 4 projects.</p>
          </div>
          <div className="project-list-count">
            <span>{launch.projects.length} projects</span>
            <span>{formatNumber(launch.totalUnits)} units</span>
          </div>
        </div>

        <CompareTray
          projects={comparedProjects}
          selectedFlatType={selectedFlatType}
          scores={projectScores}
        />

        <div className="project-card-grid">
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
              onToggleCompareProject={onToggleCompareProject}
              onSelectProject={onSelectProject}
            />
          ))}
        </div>
      </div>

      <RadarSidePanel
        comparedProjects={comparedProjects}
        scores={projectScores}
        selectedFlatType={selectedFlatType}
        scorePreset={scorePreset}
        scoreWeights={scoreWeights}
        onScorePresetChange={onScorePresetChange}
        onScoreWeightsChange={onScoreWeightsChange}
      />
    </div>
  );
}

function RadarSidePanel({
  comparedProjects,
  scores,
  selectedFlatType,
  scorePreset,
  scoreWeights,
  onScorePresetChange,
  onScoreWeightsChange,
}: {
  comparedProjects: BtoProject[];
  scores: Map<string, BtoDecisionScore>;
  selectedFlatType: FlatType;
  scorePreset: BtoScorePreset;
  scoreWeights: BtoScoreWeights;
  onScorePresetChange: (value: BtoScorePreset) => void;
  onScoreWeightsChange: (value: BtoScoreWeights) => void;
}) {
  return (
    <aside className="bto-side-panel">
      <ScoreSettingsCard
        scorePreset={scorePreset}
        scoreWeights={scoreWeights}
        onScorePresetChange={onScorePresetChange}
        onScoreWeightsChange={onScoreWeightsChange}
      />

      <div className="panel bto-compare-card">
        <h3>Shortlist & Compare</h3>
        <p>Add projects to compare up to 4 at a time.</p>
        <div className="compare-slot-list">
          {comparedProjects.map((project, index) => (
            <div key={project.id}>
              <span>{index + 1}</span>
              <strong>{project.name}</strong>
              <em>{scores.get(project.id)?.total ?? "-"}</em>
            </div>
          ))}
          {Array.from({ length: Math.max(0, 4 - comparedProjects.length) }).map((_, index) => (
            <div key={`empty-${index}`} className="compare-slot-empty">
              <span>+</span>
              <strong>Add project to compare</strong>
            </div>
          ))}
        </div>
        {comparedProjects.length >= 2 && (
          <div className="mt-4">
            <CompareTray
              projects={comparedProjects}
              selectedFlatType={selectedFlatType}
              scores={scores}
            />
          </div>
        )}
      </div>
    </aside>
  );
}

function ScoreSettingsCard({
  scorePreset,
  scoreWeights,
  onScorePresetChange,
  onScoreWeightsChange,
}: {
  scorePreset: BtoScorePreset;
  scoreWeights: BtoScoreWeights;
  onScorePresetChange: (value: BtoScorePreset) => void;
  onScoreWeightsChange: (value: BtoScoreWeights) => void;
}) {
  const handleWeightChange = (
    key: (typeof SCORE_COMPONENT_ORDER)[number],
    value: number
  ) => {
    if (scorePreset !== "custom") {
      onScorePresetChange("custom");
    }
    onScoreWeightsChange(rebalanceScoreWeights(scoreWeights, key, value));
  };

  return (
    <div className="panel bto-score-settings bto-score-card-open">
      <div className="bto-score-card-head">
        <h3>Score Weights</h3>
      </div>
      <label className="score-control-group" htmlFor="side-score-preset">
        <span>Priority</span>
        <select
          id="side-score-preset"
          value={scorePreset}
          onChange={(event) =>
            onScorePresetChange(event.target.value as BtoScorePreset)
          }
          className="control w-full"
        >
          {BTO_SCORE_PRESET_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="score-selected-note">
        <Icon name="check" />
        <span>{BTO_SCORE_PRESET_DETAILS[scorePreset].focus}</span>
      </div>

      <div className="score-slider-list" aria-label="Radar score weights">
        {SCORE_COMPONENT_ORDER.map((key) => (
          <ScoreWeightSlider
            key={key}
            icon={SCORE_COMPONENT_ICONS[key]}
            label={BTO_SCORE_COMPONENT_DETAILS[key].label}
            description={BTO_SCORE_COMPONENT_DETAILS[key].description}
            value={scoreWeights[key]}
            onChange={(value) => handleWeightChange(key, value)}
          />
        ))}
      </div>
    </div>
  );
}

function ScoreWeightSlider({
  label,
  value,
  icon,
  onChange,
  description,
}: {
  label: string;
  value: number;
  icon: IconName;
  onChange: (value: number) => void;
  description?: string;
}) {
  const [showTip, setShowTip] = useState(false);
  const tipId = useId();
  return (
    <div className="score-weight-slider">
      <div className="score-weight-slider-head">
        <Icon name={icon} />
        <span>
          {label}
          {description && (
            <span
              className="bto-breakdown-info"
              onMouseEnter={() => setShowTip(true)}
              onMouseLeave={() => setShowTip(false)}
              onFocus={() => setShowTip(true)}
              onBlur={() => setShowTip(false)}
              aria-describedby={tipId}
              tabIndex={0}
            >
              <Icon name="info" />
              {showTip && (
                <span id={tipId} className="bto-tooltip" role="tooltip">
                  {description}
                </span>
              )}
            </span>
          )}
        </span>
        <strong>{value}%</strong>
      </div>
      <input
        type="range"
        min={0}
        max={70}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={`${label} weight`}
        className="interactive-slider score-mini-slider"
      />
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
  onToggleCompareProject,
  onSelectProject,
}: {
  project: BtoProject;
  selectedFlatType: FlatType;
  decisionScore: BtoDecisionScore | null;
  isSelected: boolean;
  isCompareSelected: boolean;
  isCompareDisabled: boolean;
  onToggleCompareProject: (projectId: string) => void;
  onSelectProject: (projectId: string) => void;
}) {
  const selectedVariant = getSelectedVariant(project, selectedFlatType);
  const scoreTotal = decisionScore?.total ?? null;
  const scoreColor = scoreTotal === null ? "" : scoreTotal >= 70 ? "bto-score-green" : scoreTotal >= 50 ? "bto-score-amber" : "bto-score-red";

  const [showBudgetTip, setShowBudgetTip] = useState(false);
  const budgetTipId = useId();
  const affordabilityComp = decisionScore?.components.find((c) => c.key === "affordability");
  const affordabilityGood = affordabilityComp && affordabilityComp.score >= 70 && affordabilityComp.reason.toLowerCase().includes("within");

  const strengths = decisionScore
    ? decisionScore.components
        .filter((c) => c.score >= 70)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
    : [];

  const tradeoffs = decisionScore
    ? decisionScore.components
        .filter((c) => c.score < 50)
        .sort((a, b) => a.score - b.score)
        .slice(0, 2)
    : [];

  return (
    <article
      className={`bto-project-card ${
        isSelected ? "bto-project-card-selected" : ""
      }`}
    >
      {/* HEADER */}
      <div className="bto-card-header">
        <div className="bto-card-header-main">
          <div className="bto-card-header-text">
            <h4 className="bto-card-title">{project.name}</h4>
            <div className="bto-card-tags">
              <ProjectTypeBadge type={project.btoType} />
              <span className="bto-card-tag">{project.location}</span>
              {project.nearestMrtDistanceMeters && project.nearestMrtDistanceMeters <= 800 && (
                <span className="bto-card-tag bto-card-tag-accent">Near MRT</span>
              )}
            </div>
          </div>

          {decisionScore && (
            <div className={`bto-score-badge ${scoreColor}`}>
              <div className="bto-score-badge-value">{scoreTotal}</div>
              <div className="bto-score-badge-label">/100</div>
            </div>
          )}
        </div>

        <div className="bto-card-actions">
          <button
            type="button"
            className={`bto-btn-use-plan ${isSelected ? "bto-btn-use-plan-active" : ""}`}
            onClick={() => onSelectProject(project.id)}
          >
            {isSelected ? "Selected" : "Use in Plan"}
          </button>
          <button
            type="button"
            className={`bto-btn-compare ${isCompareSelected ? "bto-btn-compare-active" : ""}`}
            disabled={isCompareDisabled}
            aria-pressed={isCompareSelected}
            onClick={() => onToggleCompareProject(project.id)}
          >
            {isCompareSelected ? "Comparing" : "Compare"}
          </button>
          {project.sourceUrl && (
            <a
              href={project.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="bto-btn-view"
            >
              View Details
            </a>
          )}
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="bto-kpi-strip">
        <span className="bto-kpi">
          <Icon name="home" />
          <strong>{selectedVariant ? currency(selectedVariant.basePrice) : `No ${selectedFlatType} price`}</strong>
          <span className="bto-kpi-sublabel">est.</span>
          {affordabilityComp && (
            <span
              className={`bto-kpi-badge ${affordabilityGood ? "bto-kpi-badge-good" : "bto-kpi-badge-warn"}`}
              onMouseEnter={() => setShowBudgetTip(true)}
              onMouseLeave={() => setShowBudgetTip(false)}
              onFocus={() => setShowBudgetTip(true)}
              onBlur={() => setShowBudgetTip(false)}
              aria-describedby={budgetTipId}
              tabIndex={0}
            >
              {affordabilityGood ? "✓ Budget" : "⚠ Over"}
              {showBudgetTip && (
                <span id={budgetTipId} className="bto-tooltip" role="tooltip">
                  {affordabilityGood
                    ? "This price is within your HDB loan + EHG grant estimate."
                    : "This price exceeds your estimated budget. You may need additional cash or a larger loan."}
                </span>
              )}
            </span>
          )}
        </span>
        <span className="bto-kpi-divider" />
        <span className="bto-kpi">
          <Icon name="calendar" />
          <strong>{project.expectedTop ?? "—"}</strong>
          <span>TOP</span>
        </span>
        <span className="bto-kpi-divider" />
        <span className="bto-kpi">
          <Icon name="metro" />
          <strong>{project.nearestMrtDistanceMeters ? formatDistance(project.nearestMrtDistanceMeters) : "—"}</strong>
          <span>{project.nearestMrt ?? "MRT"}</span>
        </span>
        <span className="bto-kpi-divider" />
        <span className="bto-kpi">
          <Icon name="building" />
          <strong>{formatNumber(project.totalUnits)}</strong>
          <span>Units</span>
        </span>
      </div>

      {/* INSIGHTS + DETAILS */}
      {decisionScore && (
        <div className="bto-insights-row">
          {/* Insights */}
          <div className="bto-insights">
            {strengths.length > 0 && (
              <div className="bto-insight-group">
                <span className="bto-insight-title">Strengths</span>
                <div className="bto-insight-chips">
                  {strengths.map((c) => (
                    <span key={c.key} className="bto-insight-chip bto-insight-strength">
                      <Icon name="check" />
                      {c.reason}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {tradeoffs.length > 0 && (
              <div className="bto-insight-group">
                <span className="bto-insight-title">Tradeoffs</span>
                <div className="bto-insight-chips">
                  {tradeoffs.map((c) => (
                    <span key={c.key} className="bto-insight-chip bto-insight-tradeoff">
                      <Icon name="alert" />
                      {c.reason}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {strengths.length === 0 && tradeoffs.length === 0 && (
              <div className="bto-insight-empty">
                <Icon name="info" />
                Not enough data to generate insights
              </div>
            )}
          </div>

          {/* Details */}
          <div className="bto-details-panel">
            <div className="bto-detail-item">
              <span className="bto-detail-item-label">Category</span>
              <span className="bto-detail-item-value">{formatProjectType(project.btoType) || "—"}</span>
            </div>
            <div className="bto-detail-item">
              <span className="bto-detail-item-label">Flat sizes</span>
              <span className="bto-detail-item-value">{formatFlatSizes(project)}</span>
            </div>
            <div className="bto-detail-item">
              <span className="bto-detail-item-label">Source</span>
              <span className="bto-detail-item-value">{getBtoProjectSourceLabel(project)}</span>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div className="bto-card-footer">
        <span className="bto-card-footer-note">
          <Icon name="info" />
          {getBtoProjectSourceNote(project)}
        </span>
        {project.sourceUrl ? (
          <a
            href={project.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="bto-card-footer-link"
          >
            View source <Icon name="external" />
          </a>
        ) : null}
      </div>
    </article>
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
      <span>Sources</span>
      {BTO_SOURCE_CREDITS.map((source) => (
        <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
          {source.label}
        </a>
      ))}
    </div>
  );
}

function rebalanceScoreWeights(
  weights: BtoScoreWeights,
  changedKey: (typeof SCORE_COMPONENT_ORDER)[number],
  value: number
): BtoScoreWeights {
  const nextValue = Math.min(Math.max(Math.round(value), 0), 100);
  const otherKeys = SCORE_COMPONENT_ORDER.filter((key) => key !== changedKey);
  const remainder = 100 - nextValue;
  const otherTotal = otherKeys.reduce((sum, key) => sum + weights[key], 0);

  const nextWeights: BtoScoreWeights = {
    ...weights,
    [changedKey]: nextValue,
  };

  if (otherTotal <= 0) {
    const base = Math.floor(remainder / otherKeys.length);
    let extra = remainder - base * otherKeys.length;

    otherKeys.forEach((key) => {
      nextWeights[key] = base + (extra > 0 ? 1 : 0);
      extra -= 1;
    });

    return nextWeights;
  }

  const weightedShares = otherKeys.map((key) => {
    const raw = (weights[key] / otherTotal) * remainder;

    return {
      key,
      floor: Math.floor(raw),
      fraction: raw - Math.floor(raw),
    };
  });
  const allocated = weightedShares.reduce((sum, share) => sum + share.floor, 0);
  let extra = remainder - allocated;

  weightedShares
    .sort((a, b) => b.fraction - a.fraction)
    .forEach((share) => {
      nextWeights[share.key] = share.floor + (extra > 0 ? 1 : 0);
      if (extra > 0) extra -= 1;
    });

  return nextWeights;
}

function groupProjectsByLaunch(
  projects: BtoProject[],
  flatType: FlatType,
  loanAmount: number,
  ehgGrant: number,
  totalAffordability: number,
  scorePreset: BtoScorePreset,
  scoreWeights: BtoScoreWeights
) {
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

      const scores = scoreBtoProjects(
        launchProjects,
        { flatType, loanAmount, ehgGrant, totalAffordability },
        "buyer-fit",
        scorePreset,
        scoreWeights
      );

      return {
        key,
        projects: [...launchProjects].sort(sortProjectsForLaunch(flatType, scores)),
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

function sortProjectsForLaunch(
  flatType: FlatType,
  scores: Map<string, BtoDecisionScore>
) {
  return (a: BtoProject, b: BtoProject) => {
    const scoreA = scores.get(a.id)?.total;
    const scoreB = scores.get(b.id)?.total;

    if (typeof scoreB === "number" && typeof scoreA === "number") {
      return scoreB - scoreA;
    }
    if (typeof scoreB === "number") return 1;
    if (typeof scoreA === "number") return -1;

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
