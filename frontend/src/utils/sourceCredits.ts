import type { BtoProject } from "../policies/policyConfig";

export const BTO_SOURCE_CREDITS = [
  {
    label: "RecordBTO",
    url: "https://recordbto.com/bto",
    note: "project pages, listed price ranges, and MRT distance labels",
  },
  {
    label: "BTOHQ",
    url: "https://www.btohq.com/bto-sales-launch-list",
    note: "launch and project context",
  },
  {
    label: "data.gov.sg",
    url: "https://data.gov.sg/datasets/d_8d886e3a83934d7447acdf5bc6959999/view",
    note: "rail station layer for straight-line MRT distance estimates",
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

  return "Project details, price ranges, and listed MRT distance from RecordBTO.";
}
