import { useMemo, useState } from "react";
import { FLAT_TYPE_OPTIONS } from "../constants";
import type { BtoFlatVariant, BtoProject } from "../policies/policyConfig";
import { FactItem } from "./FactItem";
import type { FlatType } from "../types";
import { getLaunchMonthSortValue } from "../utils/date";
import { currency } from "../utils/format";

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
};

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

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-heritage-navy">BTO Radar</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-warm-stone">
            Start with a launch month, drill into its projects, then send one
            project into your payment plan.
          </p>
        </div>
        <a
          href="https://recordbto.com/bto"
          target="_blank"
          rel="noreferrer"
          className="text-sm font-medium text-futuristic-teal hover:text-heritage-navy"
        >
          Source: RecordBTO
        </a>
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
                    Choose a launch to see its projects.
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
                  selectedFlatType={selectedFlatType}
                  selectedProjectId={selectedProjectId}
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
    </button>
  );
}

function ProjectDrilldown({
  launch,
  selectedFlatType,
  selectedProjectId,
  onSelectProject,
}: {
  launch: LaunchGroup;
  selectedFlatType: FlatType;
  selectedProjectId: string | null;
  onSelectProject: (projectId: string) => void;
}) {
  return (
    <div className="panel bto-reveal overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-heritage-navy/10 p-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-base font-semibold text-heritage-navy">
            {launch.key}
          </h3>
          <p className="mt-1 text-sm text-warm-stone">
            Pick a project to prefill flat type, price, launch month, and TOP in
            your Plan page.
          </p>
        </div>
        <div className="text-sm text-warm-stone">
          {launch.projects.length} projects, {formatNumber(launch.totalUnits)} units
        </div>
      </div>

      <div className="grid gap-3 p-4 md:grid-cols-2">
        {launch.projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            selectedFlatType={selectedFlatType}
            isSelected={project.id === selectedProjectId}
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
  onSelectProject,
}: {
  project: BtoProject;
  selectedFlatType: FlatType;
  isSelected: boolean;
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
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
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
        <FactItem label="Nearest MRT" value={project.nearestMrt ?? "Not listed"} />
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-warm-stone">
        <span>Wait: {project.waitTimeMonths ?? "Not listed"}</span>
      </div>
    </article>
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

      return {
        key,
        projects: [...launchProjects].sort(sortProjectsForLaunch(flatType)),
        totalUnits,
        lowestPrice: prices.length ? Math.min(...prices) : null,
      };
    })
    .sort((a, b) => getLaunchMonthSortValue(b.key) - getLaunchMonthSortValue(a.key));
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
  const area = variant.floorAreaSqm
    ? `, ${variant.floorAreaSqm} sqm, ${currency(variant.basePrice / variant.floorAreaSqm)}/sqm`
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

function ProjectTypeBadge({ type }: { type: string | undefined }) {
  if (!type) return null;
  const lower = type.toLowerCase();
  
  let layout = "bg-heritage-navy/5 text-heritage-navy";
  if (lower === "prime") layout = "bg-amber-100 text-amber-800";
  else if (lower === "plus") layout = "bg-blue-100 text-blue-800";
  else if (lower === "standard") layout = "bg-emerald-100 text-emerald-800";
  
  return (
    <span className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider ${layout}`}>
      {formatProjectType(type)}
    </span>
  );
}

function formatNumber(value: number | undefined) {
  return typeof value === "number" ? value.toLocaleString("en-SG") : "Not listed";
}
