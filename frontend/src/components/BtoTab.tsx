import { useMemo, useState } from "react";
import { FLAT_TYPE_OPTIONS } from "../constants";
import type { BtoFlatVariant, BtoProject } from "../policies/policyConfig";
import { FactItem } from "./FactItem";
import type { FlatType } from "../types";
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
  selectedProjectId: string | null;
  onRetry: () => void;
  onYearFilterChange: (value: string) => void;
  onTownQueryChange: (value: string) => void;
  onFlatTypeChange: (value: FlatType) => void;
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

export function BtoTab({
  btoProjects,
  btoLoading,
  btoError,
  availableYears,
  yearFilter,
  townQuery,
  filteredProjects,
  selectedFlatType,
  selectedProjectId,
  onRetry,
  onYearFilterChange,
  onTownQueryChange,
  onFlatTypeChange,
  onSelectProject,
  onResetFilters,
}: BtoTabProps) {
  const [activeLaunch, setActiveLaunch] = useState<string | null>(null);
  const [comparedProjectIds, setComparedProjectIds] = useState<string[]>([]);
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
  selectedProjectId,
  onToggleCompareProject,
  onSelectProject,
}: {
  launch: LaunchGroup;
  comparedProjectIds: string[];
  selectedFlatType: FlatType;
  selectedProjectId: string | null;
  onToggleCompareProject: (projectId: string) => void;
  onSelectProject: (projectId: string) => void;
}) {
  const comparedProjects = comparedProjectIds
    .map((projectId) => launch.projects.find((project) => project.id === projectId))
    .filter((project): project is BtoProject => Boolean(project));

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
      />

      <div className="grid gap-3 p-4 md:grid-cols-2">
        {launch.projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            selectedFlatType={selectedFlatType}
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
  isSelected,
  isCompareSelected,
  isCompareDisabled,
  compareCount,
  onToggleCompareProject,
  onSelectProject,
}: {
  project: BtoProject;
  selectedFlatType: FlatType;
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
      className={`grid gap-4 rounded-hdb border p-4 transition-colors duration-200 ${
        isSelected
          ? "border-heritage-navy/30 bg-heritage-navy/[0.04]"
          : "border-heritage-navy/10 bg-white hover:border-heritage-navy/20"
      }`}
    >
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {project.sourceUrl ? (
              <a
                href={project.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-heritage-navy hover:text-futuristic-teal"
              >
                {project.name}
              </a>
            ) : (
              <h4 className="font-semibold text-heritage-navy">{project.name}</h4>
            )}
            <ProjectTypeBadge type={project.btoType} />
          </div>
          <p className="mt-1 text-sm text-warm-stone">{project.location}</p>
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

function CompareTray({
  projects,
  selectedFlatType,
}: {
  projects: BtoProject[];
  selectedFlatType: FlatType;
}) {
  if (projects.length < 2) {
    return (
      <div className="border-b border-heritage-navy/10 px-4 py-3 text-sm text-warm-stone">
        Select 2 to 4 projects in this launch to compare them side by side.
      </div>
    );
  }

  const rows = buildCompareRows(projects, selectedFlatType);

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

function buildCompareRows(projects: BtoProject[], selectedFlatType: FlatType): CompareRow[] {
  return [
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
