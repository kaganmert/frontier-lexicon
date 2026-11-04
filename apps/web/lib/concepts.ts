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
 * Drafts are dropped here and nowhere else: nothing in the site can reach one,
 * so no draft page, `.md`, OG image, sitemap or llms entry is ever built.
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
