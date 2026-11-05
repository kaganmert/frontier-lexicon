import { z } from "zod";
import raw from "../../../content/graph.json";
import { statuses } from "./concept-model";
import { tracks } from "./site";

/** Edge types of `graph.json`, as `lexicon-core` serialises them. */
export const edgeTypes = [
  "PREREQUISITE_OF",
  "MEASURES",
  "MITIGATES",
  "CAUSES",
  "RELATED_TO",
] as const;
export type EdgeType = (typeof edgeTypes)[number];

/** A coordinate of the fixed layout: normalised to `[0, 1]`. */
const unit = z.number().min(0).max(1);

/**
 * `content/graph.json`, written by `lexicon build` (FLN-08). It holds titles
 * but no descriptions or questions, so draft text cannot leak through it.
 */
export const graphSchema = z
  .object({
    version: z.literal(1),
    layers: z.array(
      z.object({ layer: z.number().int().min(1), name: z.string().min(1) }),
    ),
    nodes: z.array(
      z.object({
        slug: z.string().min(1),
        title: z.string().min(1),
        layer: z.number().int().min(1),
        track: z.enum(tracks),
        status: z.enum(statuses),
        x: unit,
        y: unit,
      }),
    ),
    edges: z.array(
      z.object({
        from: z.string().min(1),
        to: z.string().min(1),
        type: z.enum(edgeTypes),
      }),
    ),
  })
  // What `lexicon-core` guarantees and the map relies on: bands are placed by
  // layer number, nodes are keyed by slug, and an edge needs two ends.
  .superRefine((graph, ctx) => {
    graph.layers.forEach(({ layer }, i) => {
      if (layer !== i + 1) {
        ctx.addIssue({
          code: "custom",
          path: ["layers", i, "layer"],
          message: `expected layer ${i + 1}: layers are numbered 1, 2, 3, … in order`,
        });
      }
    });
    const slugs = new Set<string>();
    graph.nodes.forEach((node, i) => {
      if (node.layer > graph.layers.length) {
        ctx.addIssue({
          code: "custom",
          path: ["nodes", i, "layer"],
          message: `layer ${node.layer} is not in "layers"`,
        });
      }
      if (slugs.has(node.slug)) {
        ctx.addIssue({
          code: "custom",
          path: ["nodes", i, "slug"],
          message: `"${node.slug}" is not unique`,
        });
      }
      slugs.add(node.slug);
    });
    graph.edges.forEach((edge, i) => {
      for (const end of ["from", "to"] as const) {
        if (!slugs.has(edge[end])) {
          ctx.addIssue({
            code: "custom",
            path: ["edges", i, end],
            message: `"${edge[end]}" is not a node`,
          });
        }
      }
      if (edge.from === edge.to) {
        ctx.addIssue({
          code: "custom",
          path: ["edges", i],
          message: `"${edge.from}" has an edge to itself`,
        });
      }
    });
  });

export type Graph = z.infer<typeof graphSchema>;
export type GraphNode = Graph["nodes"][number];
export type GraphEdge = Graph["edges"][number];

/** Validates `data` as `graph.json`; throws a message naming the bad fields. */
export function parseGraph(data: unknown): Graph {
  const result = graphSchema.safeParse(data);
  if (!result.success) {
    throw new Error(
      `content/graph.json does not match the expected shape; regenerate it with \`lexicon build\`:\n${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}

/** Parsed once at module load, so a malformed file fails the build. */
export const graph: Graph = parseGraph(raw);
