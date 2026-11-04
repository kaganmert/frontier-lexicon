import { describe, expect, it } from "vitest";
import {
  groupByLayer,
  groupByTrack,
  publishedOnly,
  sortConcepts,
} from "./concept-model";
import { contextWindow, promptCaching, sycophancy } from "./seo/fixtures";

const coding = {
  ...sycophancy,
  slug: "harness",
  title: "Harness",
  track: "coding" as const,
  layer: 2,
};

describe("sortConcepts", () => {
  it("orders by layer, then shared → coding → research, then slug", () => {
    const sorted = sortConcepts([sycophancy, coding, contextWindow]);
    expect(sorted.map((c) => c.slug)).toEqual([
      "context-window",
      "harness",
      "sycophancy",
    ]);
  });

  it("compares slugs by code unit, not titles, so it matches the Rust order", () => {
    const agent = { ...coding, title: "Agent", slug: "coding-agent" };
    const compaction = { ...coding, title: "Compaction", slug: "autocompact" };
    expect(sortConcepts([agent, compaction]).map((c) => c.slug)).toEqual([
      "autocompact",
      "coding-agent",
    ]);
    // Code-unit order puts digits before letters and "a-b" before "ab".
    const ab = { ...coding, slug: "ab" };
    const aDashB = { ...coding, slug: "a-b" };
    const a2 = { ...coding, slug: "a2" };
    expect(sortConcepts([ab, a2, aDashB]).map((c) => c.slug)).toEqual([
      "a-b",
      "a2",
      "ab",
    ]);
  });
});

describe("publishedOnly", () => {
  it("drops drafts and keeps the input order", () => {
    expect(
      publishedOnly([sycophancy, promptCaching, contextWindow]).map(
        (c) => c.slug,
      ),
    ).toEqual(["sycophancy", "context-window"]);
  });
});

describe("groupByLayer / groupByTrack", () => {
  it("buckets by layer in ascending order, and by track in display order", () => {
    const byLayer = groupByLayer([sycophancy, coding, contextWindow]);
    expect([...byLayer.keys()]).toEqual([2, 5]);
    const byTrack = groupByTrack(byLayer.get(2)!);
    expect([...byTrack.keys()]).toEqual(["shared", "coding"]);
  });
});
