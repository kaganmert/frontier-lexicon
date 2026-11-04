/** Site-wide constants. Every absolute URL on the site derives from `siteUrl`. */

const DEFAULT_SITE_URL = "https://lexicon.kaganmert.com";

function normaliseSiteUrl(raw: string | undefined): string {
  const value = (raw ?? "").trim();
  if (value === "") return DEFAULT_SITE_URL;
  return value.replace(/\/+$/, "");
}

export const siteUrl = normaliseSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

export const siteName = "frontier-lexicon";

export const siteDescription =
  "An interactive, layered map of modern AI concepts, from tokens to alignment research. Each concept has a plain-language theory, a hands-on exercise and the concepts you need first.";

/** Turn a site-relative path (`/concepts/token/`) into an absolute URL. */
export function absoluteUrl(path: string, base: string = siteUrl): string {
  const cleanBase = base.replace(/\/+$/, "");
  if (path === "" || path === "/") return `${cleanBase}/`;
  return `${cleanBase}${path.startsWith("/") ? path : `/${path}`}`;
}

export const tracks = ["coding", "research", "shared"] as const;
export type Track = (typeof tracks)[number];

export const trackLabel: Record<Track, string> = {
  coding: "Coding",
  research: "Research",
  shared: "Shared",
};

export const layerNames: Record<number, string> = {
  1: "Model fundamentals",
  2: "Context, requests and cost",
  3: "Agents and the work loop",
  4: "Integration and permissions",
  5: "Sources and failure modes",
  6: "Memory and steering",
  7: "Shaping the task",
  8: "Session renewal and handoff",
  9: "Control and ways of working",
  10: "Research vocabulary",
};

export function layerName(layer: number): string {
  return layerNames[layer] ?? `Layer ${layer}`;
}
