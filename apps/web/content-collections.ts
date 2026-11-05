import { defineCollection, defineConfig } from "@content-collections/core";
import { compileMDX } from "@content-collections/mdx";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  conceptMarkdownPath,
  publishedOnly,
  slugPattern,
  type Concept,
} from "./lib/concept-model";
import { conceptFrontMatter } from "./lib/concept-schema";
import { conceptToMarkdown } from "./lib/seo/markdown";

const concepts = defineCollection({
  name: "concepts",
  directory: "../../content/concepts",
  include: "**/*.mdx",
  schema: conceptFrontMatter,
  transform: async (doc, context) => {
    const slug = doc._meta.path;
    if (!slugPattern.test(slug)) {
      throw new Error(
        `${doc._meta.filePath}: concept files must sit directly in content/concepts/ and be named <slug>.mdx with a lowercase kebab-case slug (got "${slug}")`,
      );
    }
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
 * Content Collections bundles this file into `.content-collections/cache/`
 * before running it, so neither `import.meta.dirname` nor `process.cwd()`
 * reliably names this package. Walk up from the bundle until a `package.json`
 * appears; that is `apps/web`.
 */
function packageRoot(): string {
  let dir = import.meta.dirname;
  while (!existsSync(path.join(dir, "package.json"))) {
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(
        `content-collections.ts: no package.json above ${import.meta.dirname}`,
      );
    }
    dir = parent;
  }
  return dir;
}

/**
 * Every published lesson is also available as plain Markdown at
 * `/concepts/<slug>/index.md`; drafts get no file.
 * Static export cannot emit a dynamic route handler when there are no concepts,
 * so the files are written into `public/` (which Next copies verbatim into
 * `out/`) instead. `public/concepts/` is generated and git-ignored.
 */
async function writeMarkdownAlternates(documents: Concept[]) {
  const publicDir = path.join(packageRoot(), "public");
  await rm(path.join(publicDir, "concepts"), { recursive: true, force: true });
  for (const concept of publishedOnly(documents)) {
    const file = path.join(publicDir, conceptMarkdownPath(concept.slug));
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, conceptToMarkdown(concept), "utf8");
  }
}

export default defineConfig({
  content: [concepts],
});
