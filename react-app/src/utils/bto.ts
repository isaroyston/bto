import type { BtoProject } from "../policies/policyConfig";
import { EHG_FAMILIES_BANDS_2024 } from "../policies/policyConfig";

export type HeatmapItem = {
  area: string;
  average: number;
  count: number;
  sources: string[];
};

export type HeatmapData = {
  items: HeatmapItem[];
  min: number;
  max: number;
};

export const getEhgBand = (income: number) =>
  EHG_FAMILIES_BANDS_2024.find(
    (band) => income >= band.minIncome && income <= band.maxIncome
  ) ?? null;

export const getHeatmapData = (projects: BtoProject[]): HeatmapData => {
  if (projects.length === 0) {
    return { items: [], min: 0, max: 0 };
  }

  const totals = new Map<string, { sum: number; count: number; sources: Set<string> }>();

  projects.forEach((project) => {
    const area = project.location || project.district || "NA";
    const source = project.dataSource ?? "fallback";

    project.flatVariants.forEach((variant) => {
      const entry = totals.get(area) ?? { sum: 0, count: 0, sources: new Set() };
      entry.sum += variant.basePrice;
      entry.count += 1;
      entry.sources.add(source);
      totals.set(area, entry);
    });
  });

  const items = Array.from(totals.entries())
    .map(([area, data]) => ({
      area,
      average: data.count ? data.sum / data.count : 0,
      count: data.count,
      sources: Array.from(data.sources),
    }))
    .sort((a, b) => a.area.localeCompare(b.area));

  if (items.length === 0) {
    return { items, min: 0, max: 0 };
  }

  const values = items.map((item) => item.average);
  const min = Math.min(...values);
  const max = Math.max(...values);

  return { items, min, max };
};

export const getProjectYear = (project: BtoProject): number | null => {
  const candidates = [project.launchMonth, project.name];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const match = candidate.match(/(19|20)\d{2}/);
    if (match) return Number(match[0]);
  }
  return null;
};

export const getAvailableYears = (projects: BtoProject[]) => {
  const years = new Set<number>();
  projects.forEach((project) => {
    const year = getProjectYear(project);
    if (year) years.add(year);
  });
  return Array.from(years).sort((a, b) => b - a);
};

export const getActiveYear = (yearFilter: string, availableYears: number[]) => {
  if (yearFilter === "latest") return availableYears[0] ?? null;
  if (yearFilter === "all") return null;

  const parsed = Number(yearFilter);
  return Number.isFinite(parsed) ? parsed : null;
};

export const sortBtoProjects = (projects: BtoProject[]) =>
  [...projects].sort((a, b) => {
    const townA = (a.location || a.district || "").toLowerCase();
    const townB = (b.location || b.district || "").toLowerCase();
    if (townA !== townB) return townA.localeCompare(townB);
    return a.name.localeCompare(b.name);
  });

export const filterBtoProjects = (
  projects: BtoProject[],
  activeYear: number | null,
  townQuery: string
) => {
  const query = townQuery.trim().toLowerCase();

  return sortBtoProjects(
    projects.filter((project) => {
      const projectYear = getProjectYear(project);
      if (activeYear && projectYear !== activeYear) return false;
      if (!query) return true;

      const town = (project.location || project.district || "").toLowerCase();
      return town.includes(query);
    })
  );
};

export const getLatestBtoProjects = (projects: BtoProject[], limit = 2) => {
  const latestYear = getAvailableYears(projects)[0] ?? null;
  const latestProjects = latestYear
    ? projects.filter((project) => getProjectYear(project) === latestYear)
    : projects;

  return sortBtoProjects(latestProjects).slice(0, limit);
};
