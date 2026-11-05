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

  it("rejects an edge from a node to itself", () => {
    const bad = {
      ...valid,
      edges: [{ from: "token", to: "token", type: "RELATED_TO" }],
    };
    expect(() => parseGraph(bad)).toThrow(/itself[\s\S]*edges\[0\]/);
  });

  it("rejects layers that are not numbered 1, 2, 3, … in order", () => {
    const bad = {
      ...valid,
      layers: [...valid.layers, { layer: 3, name: "Agents and the work loop" }],
    };
    expect(() => parseGraph(bad)).toThrow(/layers\[1\]\.layer/);
  });

  it("rejects a node in a layer the file does not list", () => {
    const bad = { ...valid, nodes: [{ ...valid.nodes[0], layer: 2 }] };
    expect(() => parseGraph(bad)).toThrow(/nodes\[0\]\.layer/);
  });

  it("rejects two nodes with the same slug", () => {
    const bad = { ...valid, nodes: [valid.nodes[0], valid.nodes[0]] };
    expect(() => parseGraph(bad)).toThrow(/nodes\[1\]\.slug/);
  });
});
