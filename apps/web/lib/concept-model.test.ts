import { describe, expect, it } from "vitest";
import {
  groupByLayer,
  groupByTrack,
  reservedSlugs,
  sortConcepts,
} from "./concept-model";
import { contextWindow, sycophancy } from "./seo/fixtures";

const coding = {
  ...sycophancy,
  slug: "harness",
  title: "Harness",
  track: "coding" as const,
  layer: 2,
};

describe("sortConcepts", () => {
  it("orders by layer, then shared → coding → research, then title", () => {
    const sorted = sortConcepts([sycophancy, coding, contextWindow]);
    expect(sorted.map((c) => c.slug)).toEqual([
      "context-window",
      "harness",
      "sycophancy",
    ]);
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

describe("reservedSlugs", () => {
  it("reserves the names used by the site-level OpenGraph images", () => {
    expect(reservedSlugs).toEqual(["site", "concepts"]);
  });
});
