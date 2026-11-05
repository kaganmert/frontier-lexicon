/** Site-wide constants. Every absolute URL on the site derives from `siteUrl`. */

const DEFAULT_SITE_URL = "https://lexicon.kaganmert.com";

/** Validate `NEXT_PUBLIC_SITE_URL` once at startup; a bad value fails the build with a message instead of leaking relative URLs. */
function normaliseSiteUrl(raw: string | undefined): string {
  const value = (raw ?? "").trim();
  if (value === "") return DEFAULT_SITE_URL;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(
      `NEXT_PUBLIC_SITE_URL must be an absolute URL such as ${DEFAULT_SITE_URL}, got "${value}"`,
    );
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(
      `NEXT_PUBLIC_SITE_URL must use http or https, got "${value}"`,
    );
  }
  return value.replace(/\/+$/, "");
}

export const siteUrl = normaliseSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

export const siteName = "frontier-lexicon";

export const siteDescription =
  "An interactive, layered map of modern AI concepts, from tokens to alignment research. Each concept has a plain-language theory, a hands-on exercise and the concepts you need first.";

/** Turn a site-relative path (`/concepts/token/`) into an absolute URL. */
export function absoluteUrl(path: string): string {
  if (path === "" || path === "/") return `${siteUrl}/`;
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

/** The concept map (FLN-09). */
export const mapPath = "/map/";

/** Display order of the tracks; the single source for the enum everywhere. */
export const tracks = ["shared", "coding", "research"] as const;
export type Track = (typeof tracks)[number];

export const trackLabel: Record<Track, string> = {
  shared: "Shared",
  coding: "Coding",
  research: "Research",
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

/** `Layer 2: Context, requests and cost` */
export function layerHeading(layer: number): string {
  return `Layer ${layer}: ${layerName(layer)}`;
}
