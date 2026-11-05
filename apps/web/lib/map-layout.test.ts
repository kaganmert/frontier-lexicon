import { describe, expect, it } from "vitest";
import type { Graph } from "./graph";
import { mapFixture } from "./map-fixture";
import { layoutMap, truncateTitle } from "./map-layout";

const [token, , contextWindow] = mapFixture.nodes;
const layout = layoutMap(mapFixture);
const rect = (l: ReturnType<typeof layoutMap>, slug: string) =>
  l.nodes.find(({ node }) => node.slug === slug)?.rect;
const path = (l: ReturnType<typeof layoutMap>, from: string, to: string) =>
  l.edges.find(({ edge }) => edge.from === from && edge.to === to)?.d;

describe("layoutMap size", () => {
  it("fits the widest layer and all ten bands", () => {
    // Widest layer has 2 nodes: W = 2 × 184 + 2 × 24, H = 10 × 120 + 2 × 24.
    expect(layout.size).toEqual({ W: 416, H: 1248 });
  });

  it("is just the padding for an empty graph", () => {
    expect(layoutMap({ ...mapFixture, nodes: [], edges: [] }).size.W).toBe(48);
  });
});

describe("layoutMap nodes", () => {
  it("centres the node on x across the inner width and on its layer's band", () => {
    // cx = 24 + 0.25 × 368 = 116, cy = 24 + 0 × 120 + 60 = 84
    expect(rect(layout, "token")).toEqual({
      x: 36,
      y: 66,
      width: 160,
      height: 36,
      cx: 116,
      cy: 84,
    });
    // cx = 24 + 0.5 × 368 = 208, cy = 24 + 1 × 120 + 60 = 204
    expect(rect(layout, "context-window")).toMatchObject({ cx: 208, cy: 204 });
  });

  it("ignores y and places by layer", () => {
    const moved = { ...mapFixture, nodes: [{ ...contextWindow, y: 0.9 }] };
    expect(rect(layoutMap(moved), "context-window")?.cy).toBe(204);
  });

  it("rounds positions to one decimal", () => {
    // cx = 24 + 0.3333 × 368 = 146.6544
    const [, ...rest] = mapFixture.nodes;
    const third = { ...mapFixture, nodes: [{ ...token, x: 0.3333 }, ...rest] };
    expect(rect(layoutMap(third), "token")).toMatchObject({
      x: 66.7,
      cx: 146.7,
    });
  });
});

describe("layoutMap edges", () => {
  it("runs a cross-layer edge between the node boundaries, not the centres", () => {
    // Centres (116, 84) → (208, 204): the bottom edge is hit first, at
    // t = 18 / 120 = 0.15 of the way, so the line starts 13.8 right of the
    // centre and ends 13.8 left of the other one.
    expect(path(layout, "token", "context-window")).toBe(
      "M129.8 102L194.2 186",
    );
  });

  it("arcs a same-layer edge below the row instead of under the nodes between", () => {
    // Centres 116 and 300, one pitch apart: leaves and enters the bottoms 40
    // in from each centre (156, 260), control points 12 + 4 = 16 below.
    expect(path(layout, "token", "model-context-protocol")).toBe(
      "M156 102C156 118 260 118 260 102",
    );
  });

  it("draws two edges between the same nodes side by side, not on top of each other", () => {
    const both: Graph = {
      ...mapFixture,
      edges: [
        ...mapFixture.edges,
        { from: "context-window", to: "token", type: "RELATED_TO" },
      ],
    };
    const l = layoutMap(both);
    // Shifted ±4 perpendicular to (208, 204) → (116, 84), each still clipped
    // at the node boundaries (y = 102 and y = 186).
    expect(path(l, "token", "context-window")).toBe("M124.8 102L189.2 186");
    expect(path(l, "context-window", "token")).toBe("M199.2 186L134.8 102");
  });
});

describe("truncateTitle", () => {
  it("keeps titles of up to 20 characters", () => {
    expect(truncateTitle("Context window")).toBe("Context window");
    expect(truncateTitle("a".repeat(20))).toBe("a".repeat(20));
  });

  it("cuts longer ones to 20 characters ending in an ellipsis", () => {
    const short = truncateTitle("Model Context Protocol (MCP)");
    expect(short).toBe("Model Context Proto…");
    expect([...short]).toHaveLength(20);
  });
});
