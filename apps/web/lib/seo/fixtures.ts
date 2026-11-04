import type { Concept } from "../concept-model";

/** Worked example used across the SEO helper tests. */
export const contextWindow: Concept = {
  slug: "context-window",
  title: "Context window",
  description:
    "The maximum number of tokens a model can read and write in one request, and why running out of it degrades answers.",
  layer: 2,
  track: "shared",
  status: "published",
  body: "Every model has a fixed budget of tokens per request.\n\n## Why it matters\n\nRunning out of it silently drops context.\n",
  mdx: "",
};

export const sycophancy: Concept = {
  slug: "sycophancy",
  title: "Sycophancy",
  description:
    "When a model changes a correct answer because the user pushed back.",
  layer: 5,
  track: "research",
  status: "published",
  body: "Sycophancy is measurable: ask, push back, count the flips.\n",
  mdx: "",
};

/** A draft; `publishedOnly` must drop it. */
export const promptCaching: Concept = {
  slug: "prompt-caching",
  title: "Prompt caching",
  description: "Reusing the computed prefix of a prompt across requests.",
  layer: 2,
  track: "shared",
  status: "draft",
  body: "",
  mdx: "",
};
