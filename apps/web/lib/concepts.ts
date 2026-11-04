import { allConcepts } from "content-collections";
import { sortConcepts, type Concept } from "./concept-model";

export type { Concept, ConceptSummary } from "./concept-model";
export {
  conceptEyebrow,
  conceptMarkdownPath,
  conceptPath,
  conceptsIndexPath,
  groupByLayer,
  groupByTrack,
} from "./concept-model";

/** The collection is fixed at build time, so sort and index it once. */
const concepts: readonly Concept[] = sortConcepts(allConcepts);
const bySlug = new Map(concepts.map((concept) => [concept.slug, concept]));

export function getConcepts(): readonly Concept[] {
  return concepts;
}

export function getConcept(slug: string): Concept | undefined {
  return bySlug.get(slug);
}
