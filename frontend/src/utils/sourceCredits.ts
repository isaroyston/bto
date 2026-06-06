import type { BtoProject } from "../policies/policyConfig";

export const BTO_SOURCE_CREDITS = [
  {
    label: "RecordBTO",
    url: "https://recordbto.com/bto",
    note: "project pages and listed price ranges",
  },
  {
    label: "BTOHQ",
    url: "https://www.btohq.com/bto-sales-launch-list",
    note: "launch and project context",
  },
] as const;

export function getBtoProjectSourceLabel(project: BtoProject) {
  if (project.dataSource === "recordbto+btohq") return "RecordBTO + BTOHQ";
  if (project.dataSource === "btohq") return "BTOHQ";
  return "RecordBTO";
}

export function getBtoProjectSourceNote(project: BtoProject) {
  if (project.dataSource === "recordbto+btohq") {
    return "Prices from RecordBTO, project context enriched from BTOHQ.";
  }

  if (project.dataSource === "btohq") {
    return "Project context from BTOHQ. Price may be unavailable.";
  }

  return "Project details and price ranges from RecordBTO.";
}
