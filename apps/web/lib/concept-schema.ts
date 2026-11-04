import { z } from "zod";
import { slugPattern } from "./concept-model";
import { tracks } from "./site";

const singleLine = z
  .string()
  .min(1)
  .refine((value) => !/[\r\n]/.test(value), "must be a single line");

/**
 * The subset of the concept front matter the site needs to render and
 * describe a page. The full contract is documented in `content/README.md` and
 * enforced by `crates/lexicon-core`; every other field passes through
 * untouched here.
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
