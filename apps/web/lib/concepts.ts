import { allConcepts } from "content-collections";
import { publishedOnly, sortConcepts, type Concept } from "./concept-model";

export type { Concept, ConceptSummary } from "./concept-model";
export {
  conceptEyebrow,
  conceptMarkdownPath,
  conceptPath,
  conceptsIndexPath,
  groupByLayer,
  groupByTrack,
} from "./concept-model";

/**
 * The collection is fixed at build time, so filter, sort and index it once.
 * Every page and route reads concepts through this module, and it exposes no
 * unfiltered accessor, so no draft page, OG image, sitemap or llms entry is
 * ever built. (The `.md` alternates are written before Next runs, in
 * `content-collections.ts`, with the same `publishedOnly` filter.)
 */
const published: readonly Concept[] = publishedOnly(sortConcepts(allConcepts));
const bySlug = new Map(published.map((concept) => [concept.slug, concept]));

/** Published concepts in canonical order. */
export function getPublishedConcepts(): readonly Concept[] {
  return published;
}

/** A published concept, or `undefined` for a draft or unknown slug. */
export function getConcept(slug: string): Concept | undefined {
  return bySlug.get(slug);
}
