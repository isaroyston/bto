import type { BtoProject } from "../policies/policyConfig";
import { EHG_FAMILIES_BANDS_2024 } from "../policies/policyConfig";
import type { FlatType } from "../types";

export const getEhgBand = (income: number) =>
  EHG_FAMILIES_BANDS_2024.find(
    (band) => income >= band.minIncome && income <= band.maxIncome
  ) ?? null;

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
  townQuery: string,
  flatType?: FlatType
) => {
  const query = townQuery.trim().toLowerCase();

  const filtered = projects.filter((project) => {
    const projectYear = getProjectYear(project);
    if (activeYear && projectYear !== activeYear) return false;
    if (!query) return true;

    const town = (project.location || project.district || "").toLowerCase();
    return town.includes(query);
  });

  if (!flatType) return sortBtoProjects(filtered);

  return filtered.sort((a, b) => {
    const variantA = a.flatVariants.find((variant) => variant.type === flatType);
    const variantB = b.flatVariants.find((variant) => variant.type === flatType);

    if (variantA && variantB && variantA.basePrice !== variantB.basePrice) {
      return variantA.basePrice - variantB.basePrice;
    }
    if (variantA && !variantB) return -1;
    if (!variantA && variantB) return 1;
    return sortBtoProjects([a, b])[0] === a ? -1 : 1;
  });
};
