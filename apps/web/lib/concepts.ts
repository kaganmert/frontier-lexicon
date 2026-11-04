import { allConcepts } from "content-collections";
import { sortConcepts, type Concept } from "./concept-model";

export type { Concept, ConceptSummary } from "./concept-model";
export { conceptMarkdownPath, conceptPath } from "./concept-model";

export function getConcepts(): Concept[] {
  return sortConcepts(allConcepts as unknown as Concept[]);
}

export function getConcept(slug: string): Concept | undefined {
  return getConcepts().find((c) => c.slug === slug);
}
