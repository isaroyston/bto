import type { BtoProject } from "../policies/policyConfig";
import type { HeatmapData } from "../utils/bto";
import type { AreaPath } from "../utils/map";
import { currency } from "../utils/format";
import { PriceMap } from "./PriceMap";

type BtoTabProps = {
  btoProjects: BtoProject[];
  btoLoading: boolean;
  btoError: string | null;
  availableYears: number[];
  yearFilter: string;
  townQuery: string;
  visibleCount: number;
  filteredProjects: BtoProject[];
  visibleProjects: BtoProject[];
  townHeatmap: HeatmapData;
  planningAreaPaths: AreaPath[];
  onRetry: () => void;
  onYearFilterChange: (value: string) => void;
  onTownQueryChange: (value: string) => void;
  onResetFilters: () => void;
  onShowMore: () => void;
};

export function BtoTab({
  btoProjects,
  btoLoading,
  btoError,
  availableYears,
  yearFilter,
  townQuery,
  visibleCount,
  filteredProjects,
  visibleProjects,
  townHeatmap,
  planningAreaPaths,
  onRetry,
  onYearFilterChange,
  onTownQueryChange,
  onResetFilters,
  onShowMore,
}: BtoTabProps) {
  const hasActiveFilters = yearFilter !== "latest" || townQuery.trim().length > 0;

  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <h2 className="text-3xl font-bold text-heritage-navy">BTO Radar</h2>
        <p className="max-w-2xl text-warm-stone">
          Compare town-level price bands, historical ranges, and suggested
          financing from the local HDB price range dataset.
        </p>
      </header>

      {btoLoading && (
        <div className="glass-card p-6 text-sm text-warm-stone">
          Loading local price range dataset...
        </div>
      )}
      {btoError && (
        <div className="glass-card flex items-center justify-between gap-4 p-6 text-sm text-warm-stone">
          <span>{btoError}</span>
          <button
            type="button"
            className="btn-primary px-4 py-2 text-xs"
            onClick={onRetry}
          >
            Retry
          </button>
        </div>
      )}

      {!btoLoading && !btoError && (
        <div className="space-y-4">
          <div className="glass-card flex flex-wrap items-end gap-4 p-4">
            <div className="min-w-[160px]">
              <label
                className="text-xs font-semibold uppercase text-warm-stone"
                htmlFor="year-filter"
              >
                Year focus
              </label>
              <select
                id="year-filter"
                value={yearFilter}
                onChange={(event) => onYearFilterChange(event.target.value)}
                className="mt-2 w-full rounded-hdb border border-heritage-navy/10 bg-white px-3 py-2 text-sm text-heritage-navy"
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
            <div className="min-w-[200px] flex-1">
              <label
                className="text-xs font-semibold uppercase text-warm-stone"
                htmlFor="town-filter"
              >
                Town filter
              </label>
              <input
                id="town-filter"
                type="text"
                value={townQuery}
                onChange={(event) => onTownQueryChange(event.target.value)}
                placeholder="Type a town name, e.g. Punggol"
                className="mt-2 w-full rounded-hdb border border-heritage-navy/10 bg-white px-3 py-2 text-sm text-heritage-navy"
              />
            </div>
            <div className="text-xs text-warm-stone">
              Showing {Math.min(filteredProjects.length, visibleCount)} of{" "}
              {filteredProjects.length} launches
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                className="btn-primary px-4 py-2 text-xs"
                onClick={onResetFilters}
              >
                Reset filters
              </button>
            )}
          </div>

          {filteredProjects.length === 0 ? (
            <div className="glass-card p-6 text-sm text-warm-stone">
              No launches match this filter yet. Try another year or town.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {visibleProjects.map((project) => (
                <BtoProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}

          {filteredProjects.length > visibleCount && (
            <button
              type="button"
              className="btn-primary self-start px-4 py-2 text-xs"
              onClick={onShowMore}
            >
              Show more launches
            </button>
          )}
        </div>
      )}

      <PriceMap
        btoProjects={btoProjects}
        heatmapItems={townHeatmap.items}
        heatmapMin={townHeatmap.min}
        heatmapMax={townHeatmap.max}
        planningAreaPaths={planningAreaPaths}
      />
    </section>
  );
}

function BtoProjectCard({ project }: { project: BtoProject }) {
  return (
    <div className="glass-card space-y-4 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-warm-stone">{project.launchMonth} Launch</p>
          <h3 className="text-lg font-semibold text-heritage-navy">
            {project.name}
          </h3>
          <p className="text-sm text-warm-stone">
            {project.location} - {project.district}
          </p>
        </div>
        <span className="rounded-hdb bg-futuristic-teal/10 px-2 py-1 text-xs text-futuristic-teal">
          {project.dataSource === "data.gov.sg"
            ? "HDB API"
            : project.dataSource === "local-csv"
              ? "CSV"
              : "Fallback"}
        </span>
      </div>
      <div className="space-y-2">
        {project.flatVariants.map((variant) => {
          const priceTag =
            variant.priceSource === "data.gov.sg"
              ? "HDB data"
              : variant.priceSource === "local-csv"
                ? "CSV"
                : "Estimate";
          const priceTitle =
            variant.priceNote ??
            (variant.priceSource === "data.gov.sg"
              ? "Price from data.gov.sg BTO dataset"
              : "Fallback estimate maintained in repo");
          const hasRange =
            typeof variant.minPrice === "number" &&
            typeof variant.maxPrice === "number";
          const priceDisplay = hasRange
            ? `${currency(variant.minPrice ?? 0)} - ${currency(
                variant.maxPrice ?? 0
              )}`
            : currency(variant.basePrice);
          const priceCaption = hasRange ? "Range" : "Average";

          return (
            <div
              key={`${project.id}-${variant.type}`}
              className="flex items-center justify-between gap-4 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-warm-stone">{variant.type}</span>
                <span
                  className="rounded-hdb bg-heritage-navy/10 px-2 py-0.5 text-xs text-heritage-navy/70"
                  title={priceTitle}
                >
                  {priceTag}
                </span>
                <span className="text-xs text-warm-stone/80">
                  {priceCaption}
                </span>
              </div>
              <span className="text-right font-semibold text-heritage-navy">
                {priceDisplay}
              </span>
            </div>
          );
        })}
      </div>
      <div className="text-xs text-warm-stone">
        Scheme: {project.suggestedScheme?.toUpperCase() ?? "NORMAL"}
        {project.schemeSource === "data.gov.sg"
          ? " (HDB data)"
          : project.schemeSource === "local-csv"
            ? " (CSV)"
            : " (fallback)"}
      </div>
    </div>
  );
}
