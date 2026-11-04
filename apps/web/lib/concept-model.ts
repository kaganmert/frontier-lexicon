import { layerHeading, trackLabel, tracks, type Track } from "./site";

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

export const conceptsIndexPath = "/concepts/";

/**
 * Slugs that would collide with other generated files (`/og/site.png`,
 * `/og/concepts.png`) and are therefore refused at build time.
 */
export const reservedSlugs = ["site", "concepts"] as const;

export function conceptPath(slug: string): string {
  return `${conceptsIndexPath}${slug}/`;
}

export function conceptMarkdownPath(slug: string): string {
  return `${conceptPath(slug)}index.md`;
}

/** `Layer 2: Context, requests and cost · Shared` */
export function conceptEyebrow(
  concept: Pick<ConceptSummary, "layer" | "track">,
): string {
  return `${layerHeading(concept.layer)} · ${trackLabel[concept.track]}`;
}

/** Stable order: layer, then track (in `tracks` order), then title. */
export function sortConcepts<T extends ConceptSummary>(
  concepts: readonly T[],
): T[] {
  return [...concepts].sort(
    (a, b) =>
      a.layer - b.layer ||
      tracks.indexOf(a.track) - tracks.indexOf(b.track) ||
      a.title.localeCompare(b.title, "en"),
  );
}

/** Concepts bucketed by layer, each bucket in `sortConcepts` order. */
export function groupByLayer<T extends ConceptSummary>(
  concepts: readonly T[],
): Map<number, T[]> {
  const groups = new Map<number, T[]>();
  for (const concept of sortConcepts(concepts)) {
    const group = groups.get(concept.layer);
    if (group) group.push(concept);
    else groups.set(concept.layer, [concept]);
  }
  return groups;
}

/** Concepts bucketed by track, in `tracks` order, empty tracks omitted. */
export function groupByTrack<T extends ConceptSummary>(
  concepts: readonly T[],
): Map<Track, T[]> {
  const groups = new Map<Track, T[]>();
  for (const track of tracks) {
    const members = concepts.filter((c) => c.track === track);
    if (members.length > 0) groups.set(track, members);
  }
  return groups;
}
