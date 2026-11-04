import { layerHeading, trackLabel, tracks, type Track } from "./site";

/** `draft` concepts exist in the graph but never on the public site. */
export const statuses = ["draft", "published"] as const;
export type Status = (typeof statuses)[number];

/** The subset of a concept document the SEO helpers and pages depend on. */
export type ConceptSummary = {
  slug: string;
  title: string;
  description: string;
  layer: number;
  track: Track;
  status: Status;
};

export type Concept = ConceptSummary & {
  /** Raw Markdown body, without front matter. */
  body: string;
  /** Compiled MDX, consumed by `MDXContent`. */
  mdx: string;
};

export const conceptsIndexPath = "/concepts/";

/**
 * Lowercase kebab-case: the only shape a slug (and so a file name) may take.
 * Must stay literally identical to the pattern quoted on `is_valid_slug` in
 * `crates/lexicon-core/src/slug.rs`.
 */
export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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

/**
 * Canonical order: layer, then track (in `tracks` order), then slug by code
 * unit. Slugs are ASCII, so this is the byte order `lexicon-core` sorts by
 * and the site lists concepts in the same order as `graph.json`.
 */
export function sortConcepts<T extends ConceptSummary>(
  concepts: readonly T[],
): T[] {
  return [...concepts].sort(
    (a, b) =>
      a.layer - b.layer ||
      tracks.indexOf(a.track) - tracks.indexOf(b.track) ||
      (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0),
  );
}

/** The concepts the public site may show: drafts dropped, order kept. */
export function publishedOnly<T extends ConceptSummary>(
  concepts: readonly T[],
): T[] {
  return concepts.filter((concept) => concept.status === "published");
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
