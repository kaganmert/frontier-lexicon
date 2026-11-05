import { describe, expect, it } from "vitest";
import { contextWindow, sycophancy } from "./fixtures";
import { buildLlmsFullTxt, buildLlmsTxt } from "./llms";

describe("buildLlmsTxt", () => {
  it("follows llmstxt.org: H1, blockquote summary, one H2 per layer with linked concepts", () => {
    const txt = buildLlmsTxt([contextWindow, sycophancy]);
    const lines = txt.split("\n");
    expect(lines[0]).toBe("# frontier-lexicon");
    expect(lines[1]).toBe("");
    expect(lines[2]).toMatch(
      /^> An interactive, layered map of modern AI concepts/,
    );
    expect(txt).toContain(
      "## Layer 2: Context, requests and cost\n\n- [Context window](https://lexicon.kaganmert.com/concepts/context-window/): The maximum number of tokens a model can read and write in one request, and why running out of it degrades answers. ([Markdown](https://lexicon.kaganmert.com/concepts/context-window/index.md))\n",
    );
    expect(txt).toContain(
      "## Layer 5: Sources and failure modes\n\n- [Sycophancy](https://lexicon.kaganmert.com/concepts/sycophancy/): When a model changes a correct answer because the user pushed back. ([Markdown](https://lexicon.kaganmert.com/concepts/sycophancy/index.md))\n",
    );
    expect(txt.indexOf("## Layer 2")).toBeLessThan(txt.indexOf("## Layer 5"));
  });

  it("ends with an Optional section pointing at the index, the map and the full dump", () => {
    const txt = buildLlmsTxt([contextWindow]);
    expect(txt).toContain(
      "## Optional\n\n- [Concept index](https://lexicon.kaganmert.com/concepts/): every concept on one page\n- [Concept map](https://lexicon.kaganmert.com/map/): every concept and edge as one layered diagram, drafts included\n- [Full content](https://lexicon.kaganmert.com/llms-full.txt): all concept pages as one Markdown file\n",
    );
    expect(txt.endsWith("\n")).toBe(true);
  });

  it("escapes square brackets in titles so the link text stays intact", () => {
    const txt = buildLlmsTxt([{ ...contextWindow, title: "RAG [retrieval]" }]);
    expect(txt).toContain(
      "- [RAG \\[retrieval\\]](https://lexicon.kaganmert.com/concepts/context-window/)",
    );
  });

  it("states the empty state explicitly when there are no concepts", () => {
    const txt = buildLlmsTxt([]);
    expect(txt).toContain(
      "## Concepts\n\nNo concepts have been published yet.\n",
    );
    expect(txt).not.toContain("## Layer");
  });
});

describe("buildLlmsFullTxt", () => {
  it("concatenates every concept's Markdown, separated by horizontal rules, after the site header", () => {
    const txt = buildLlmsFullTxt([contextWindow, sycophancy]);
    expect(txt.startsWith("# frontier-lexicon\n\n> ")).toBe(true);
    expect(txt).toContain('\n\n---\n\n---\ntitle: "Context window"');
    expect(txt).toContain('\n\n---\n\n---\ntitle: "Sycophancy"');
    expect(txt.indexOf("Context window")).toBeLessThan(
      txt.indexOf("Sycophancy"),
    );
    expect(txt.endsWith("\n")).toBe(true);
  });

  it("is just the header plus the empty-state line with no concepts", () => {
    expect(buildLlmsFullTxt([])).toMatch(
      /^# frontier-lexicon\n\n> .+\n\nNo concepts have been published yet.\n$/,
    );
  });
});
