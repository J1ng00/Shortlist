export const workTypeOptions = ["On-site", "Hybrid", "Remote", "Full-time", "Part-time", "Contract", "Casual"] as const;

export type WorkType = (typeof workTypeOptions)[number];

export function normalizeWorkType(value: string | null | undefined): WorkType | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase().replace(/[_-]+/g, " ");

  if (!normalized) {
    return null;
  }

  if (normalized.includes("hybrid")) {
    return "Hybrid";
  }

  if (normalized.includes("remote") || normalized.includes("wfh") || normalized.includes("work from home")) {
    return "Remote";
  }

  if (normalized.includes("onsite") || normalized.includes("on site") || normalized.includes("office")) {
    return "On-site";
  }

  if (normalized.includes("part time") || normalized.includes("parttime")) {
    return "Part-time";
  }

  if (normalized.includes("full time") || normalized.includes("fulltime")) {
    return "Full-time";
  }

  if (normalized.includes("contract")) {
    return "Contract";
  }

  if (normalized.includes("casual") || normalized.includes("internship") || normalized.includes("intern")) {
    return "Casual";
  }

  return null;
}
