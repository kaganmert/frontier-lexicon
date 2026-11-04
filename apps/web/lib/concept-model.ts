import type { Track } from "./site";

/** The subset of a concept document the SEO helpers and pages depend on. */
export type ConceptSummary = {
  slug: string;
  title: string;
  description: string;
  layer: number;
  track: Track;
};

export type Concept = ConceptSummary & {
  /** Raw Markdown body, without front matter. */
  body: string;
  /** Compiled MDX, consumed by `MDXContent`. */
  mdx: string;
};

export function conceptPath(slug: string): string {
  return `/concepts/${slug}/`;
}

export function conceptMarkdownPath(slug: string): string {
  return `/concepts/${slug}/index.md`;
}

/** Stable order: layer, then track, then title. */
export function sortConcepts<T extends ConceptSummary>(
  concepts: readonly T[],
): T[] {
  const trackOrder: Record<Track, number> = {
    shared: 0,
    coding: 1,
    research: 2,
  };
  return [...concepts].sort(
    (a, b) =>
      a.layer - b.layer ||
      trackOrder[a.track] - trackOrder[b.track] ||
      a.title.localeCompare(b.title, "en"),
  );
}
