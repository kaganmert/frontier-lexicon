import { z } from "zod";
import { slugPattern } from "./concept-model";
import { tracks } from "./site";

const singleLine = z
  .string()
  .min(1)
  .refine((value) => !/[\r\n]/.test(value), "must be a single line");

/**
 * Minimal front matter contract for a concept file. Only what the site needs
 * to render and describe a page is validated here; the full schema (question,
 * prerequisites, typed edges, sources, provenance) is fixed later together
 * with the Rust engine in `crates/lexicon-core`, and those fields pass through
 * untouched until then.
 *
 * `title` and `description` are single lines because they are emitted into
 * Markdown link text, a blockquote and `<meta>` attributes verbatim.
 */
export const conceptFrontMatter = z
  .object({
    title: singleLine,
    slug: z
      .string()
      .regex(slugPattern, "slug must be lowercase kebab-case")
      .optional(),
    description: singleLine.max(160),
    layer: z.number().int().min(1).max(10),
    track: z.enum(tracks),
  })
  .passthrough();

export type ConceptFrontMatter = z.infer<typeof conceptFrontMatter>;
