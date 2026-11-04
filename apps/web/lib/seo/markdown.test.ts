import { describe, expect, it } from "vitest";
import { contextWindow } from "./fixtures";
import { conceptToMarkdown } from "./markdown";

describe("conceptToMarkdown", () => {
  it("renders front matter, the title as H1, the description as a quote, then the body", () => {
    expect(conceptToMarkdown(contextWindow)).toBe(
      [
        "---",
        'title: "Context window"',
        'slug: "context-window"',
        'description: "The maximum number of tokens a model can read and write in one request, and why running out of it degrades answers."',
        "layer: 2",
        'track: "shared"',
        'canonical: "https://lexicon.kaganmert.com/concepts/context-window/"',
        "---",
        "",
        "# Context window",
        "",
        "> The maximum number of tokens a model can read and write in one request, and why running out of it degrades answers.",
        "",
        "Every model has a fixed budget of tokens per request.",
        "",
        "## Why it matters",
        "",
        "Running out of it silently drops context.",
        "",
      ].join("\n"),
    );
  });

  it("escapes double quotes in front matter strings", () => {
    const md = conceptToMarkdown({
      ...contextWindow,
      title: 'The "token" budget',
    });
    expect(md).toContain('title: "The \\"token\\" budget"');
  });

  it("always ends with exactly one trailing newline", () => {
    const md = conceptToMarkdown({
      ...contextWindow,
      body: "No newline at end",
    });
    expect(md.endsWith("end\n")).toBe(true);
    expect(md.endsWith("\n\n")).toBe(false);
  });
});
