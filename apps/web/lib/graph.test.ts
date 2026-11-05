import { describe, expect, it } from "vitest";
import { graph, parseGraph } from "./graph";
import { layerNames } from "./site";

const valid = {
  version: 1,
  layers: [{ layer: 1, name: "Model fundamentals" }],
  nodes: [
    {
      slug: "token",
      title: "Token",
      layer: 1,
      track: "shared",
      status: "draft",
      x: 0.5,
      y: 0,
    },
  ],
  edges: [],
};

describe("graph", () => {
  it("names the layers exactly as site.ts does", () => {
    expect(graph.layers.map(({ layer, name }) => [layer, name])).toEqual(
      Object.entries(layerNames).map(([layer, name]) => [Number(layer), name]),
    );
  });

  it("has an endpoint node for every edge", () => {
    const slugs = new Set(graph.nodes.map((node) => node.slug));
    for (const edge of graph.edges) {
      expect(slugs.has(edge.from) && slugs.has(edge.to)).toBe(true);
    }
  });
});

describe("parseGraph", () => {
  it("accepts a well-formed file", () => {
    expect(parseGraph(valid).nodes[0].slug).toBe("token");
  });

  it("names the file and the bad field when the shape is wrong", () => {
    const bad = { ...valid, nodes: [{ ...valid.nodes[0], x: 2 }] };
    expect(() => parseGraph(bad)).toThrow(
      /content\/graph\.json[\s\S]*nodes\[0\]\.x/,
    );
  });

  it("rejects an edge to an unknown node", () => {
    const bad = {
      ...valid,
      edges: [{ from: "token", to: "ghost", type: "RELATED_TO" }],
    };
    expect(() => parseGraph(bad)).toThrow(/ghost/);
  });
});
