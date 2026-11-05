import { describe, expect, it } from "vitest";
import { mapFixture } from "./map-fixture";
import { edgePath, nodeRect, size, truncateTitle } from "./map-layout";

const [token, mcp, contextWindow] = mapFixture.nodes;
// Widest layer has 2 nodes: W = 2 × 184 + 2 × 24, H = 10 × 120 + 2 × 24.
const fixtureSize = { W: 416, H: 1248 };

describe("size", () => {
  it("fits the widest layer and all ten bands", () => {
    expect(size(mapFixture)).toEqual(fixtureSize);
  });

  it("is just the padding for an empty graph", () => {
    expect(size({ ...mapFixture, nodes: [], edges: [] }).W).toBe(48);
  });
});

describe("nodeRect", () => {
  it("centres the node on x across the inner width and on its layer's band", () => {
    // cx = 24 + 0.25 × 368 = 116, cy = 24 + 0 × 120 + 60 = 84
    expect(nodeRect(token, fixtureSize)).toEqual({
      x: 36,
      y: 66,
      width: 160,
      height: 36,
      cx: 116,
      cy: 84,
    });
    // cx = 24 + 0.5 × 368 = 208, cy = 24 + 1 × 120 + 60 = 204
    expect(nodeRect(contextWindow, fixtureSize)).toMatchObject({
      cx: 208,
      cy: 204,
    });
  });

  it("ignores y and places by layer", () => {
    const moved = { ...contextWindow, y: 0.9 };
    expect(nodeRect(moved, fixtureSize).cy).toBe(204);
  });
});

describe("edgePath", () => {
  it("runs between the node boundaries, not the centres", () => {
    // Centres (116, 84) → (208, 204): the bottom edge is hit first, at
    // t = 18 / 120 = 0.15 of the way, so the line starts 13.8 right of the
    // centre and ends 13.8 left of the other one.
    expect(edgePath(token, contextWindow, fixtureSize)).toBe(
      "M129.8 102L194.2 186",
    );
  });

  it("leaves from the side of a node in the same layer", () => {
    // Centres (116, 84) → (300, 84): ±80 to the side edges.
    expect(edgePath(token, mcp, fixtureSize)).toBe("M196 84L220 84");
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
