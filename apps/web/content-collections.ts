import { defineCollection, defineConfig } from "@content-collections/core";
import { compileMDX } from "@content-collections/mdx";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { conceptMarkdownPath, type Concept } from "./lib/concept-model";
import { conceptToMarkdown } from "./lib/seo/markdown";

/**
 * Minimal front matter contract for a concept file. Only what the site needs
 * to render and describe a page is validated here; the full schema (question,
 * prerequisites, typed edges, sources, provenance) is fixed later together
 * with the Rust engine in `crates/lexicon-core`, and those fields pass through
 * untouched until then.
 */
export const conceptFrontMatter = z
  .object({
    title: z.string().min(1),
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be lowercase kebab-case")
      .optional(),
    description: z.string().min(1).max(160),
    layer: z.number().int().min(1).max(10),
    track: z.enum(["coding", "research", "shared"]),
  })
  .passthrough();

const concepts = defineCollection({
  name: "concepts",
  directory: "../../content/concepts",
  include: "**/*.mdx",
  schema: conceptFrontMatter,
  transform: async (doc, context) => {
    const slug = doc._meta.path;
    if (doc.slug !== undefined && doc.slug !== slug) {
      throw new Error(
        `${doc._meta.filePath}: front matter slug "${doc.slug}" does not match file name "${slug}"`,
      );
    }
    const mdx = await compileMDX(context, doc);
    return { ...doc, slug, body: doc.content, mdx };
  },
  onSuccess: writeMarkdownAlternates,
});

/**
 * Every lesson is also published as plain Markdown at `/concepts/<slug>/index.md`.
 * Static export cannot emit a dynamic route handler when there are no concepts,
 * so the files are written into `public/` (which Next copies verbatim into
 * `out/`) instead. `public/concepts/` is generated and git-ignored.
 */
async function writeMarkdownAlternates(documents: Concept[]) {
  const root = path.resolve(process.cwd(), "public", "concepts");
  await rm(root, { recursive: true, force: true });
  for (const concept of documents) {
    const file = path.join(
      process.cwd(),
      "public",
      conceptMarkdownPath(concept.slug),
    );
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, conceptToMarkdown(concept), "utf8");
  }
}

export default defineConfig({
  content: [concepts],
});
