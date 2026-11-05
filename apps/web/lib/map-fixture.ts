import type { Graph } from "./graph";
import { layerNames } from "./site";

const layers = Object.entries(layerNames).map(([layer, name]) => ({
  layer: Number(layer),
  name,
}));

/**
 * Three nodes for the map tests: two in layer 1 (the widest layer, so
 * `maxPerLayer` is 2), one in layer 2. Only `token` is published.
 */
export const mapFixture: Graph = {
  version: 1,
  layers,
  nodes: [
    {
      slug: "token",
      title: "Token",
      layer: 1,
      track: "shared",
      status: "published",
      x: 0.25,
      y: 0,
    },
    {
      slug: "model-context-protocol",
      title: "Model Context Protocol (MCP)",
      layer: 1,
      track: "coding",
      status: "draft",
      x: 0.75,
      y: 0,
    },
    {
      slug: "context-window",
      title: "Context window",
      layer: 2,
      track: "shared",
      status: "draft",
      x: 0.5,
      y: 0.1111,
    },
  ],
  edges: [
    { from: "token", to: "context-window", type: "PREREQUISITE_OF" },
    { from: "token", to: "model-context-protocol", type: "RELATED_TO" },
  ],
};
