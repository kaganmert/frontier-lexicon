import type { Graph, GraphEdge, GraphNode } from "./graph";

/**
 * Fixed-unit geometry of the concept map: 1 unit is 1 CSS pixel at zoom 1.
 * The server cannot measure text, so every node is the same size and titles
 * are truncated (`truncateTitle`) instead of measured. Positions come from
 * `graph.json`: `x` spreads a layer across the width; `y` is ignored in
 * favour of the layer's band, so band labels and nodes always line up.
 */
export const NODE_WIDTH = 160;
export const NODE_HEIGHT = 36;
export const GAP = 24;
export const BAND_HEIGHT = 120;
export const PADDING = 24;
export const FONT_SIZE = 12;
/** Baseline of a band's label, below the band's top edge. */
export const LABEL_BASELINE = 18;
export const MAX_TITLE = 20;

/** Horizontal room per node in the widest layer. */
const PITCH = NODE_WIDTH + GAP;
/**
 * Control-point depth of a same-layer arc below the nodes: grows with the
 * span so nested arcs stay apart. The curve's lowest point is 3/4 of it, so
 * the deepest arc (36 below the node) stays inside the band.
 */
const ARC_DEPTH = 12;
const ARC_DEPTH_PER_PITCH = 4;
const ARC_MAX_DEPTH = 48;
/**
 * A same-layer arc leaves and enters this far from the node's centre, towards
 * the other node, so it does not meet a vertical edge at the bottom centre.
 */
const ARC_INSET = NODE_WIDTH / 4;
/** Distance between edges that join the same two nodes. */
const PARALLEL_GAP = 8;

export type Size = { W: number; H: number };

export type NodeRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  cx: number;
  cy: number;
};

export type PlacedNode = { node: GraphNode; rect: NodeRect };
export type RoutedEdge = {
  edge: GraphEdge;
  from: GraphNode;
  to: GraphNode;
  /** SVG path data. */
  d: string;
};

/** Everything the map draws, computed once per graph. */
export type MapLayout = {
  /** The `viewBox` size, and the map's size in CSS pixels at zoom 1. */
  size: Size;
  layers: readonly number[];
  nodes: readonly PlacedNode[];
  edges: readonly RoutedEdge[];
};

export function layoutMap(graph: Graph): MapLayout {
  const box = size(graph);
  const nodes = graph.nodes.map((node) => ({
    node,
    rect: nodeRect(node, box),
  }));
  const placed = new Map(nodes.map((entry) => [entry.node.slug, entry]));

  // Edges that join the same two nodes, in either direction, would be drawn
  // on top of each other; spread them out, symmetrically around the line.
  const pairs = new Map<string, GraphEdge[]>();
  for (const edge of graph.edges) {
    const key = [edge.from, edge.to].sort().join(" ");
    pairs.set(key, [...(pairs.get(key) ?? []), edge]);
  }

  const edges = graph.edges.flatMap((edge) => {
    const from = placed.get(edge.from);
    const to = placed.get(edge.to);
    if (!from || !to) return [];
    const pair = pairs.get([edge.from, edge.to].sort().join(" ")) ?? [edge];
    const offset = (pair.indexOf(edge) - (pair.length - 1) / 2) * PARALLEL_GAP;
    // The same side for both directions: measured from the slug that sorts first.
    const [first, second] =
      edge.from < edge.to ? [from.rect, to.rect] : [to.rect, from.rect];
    return [
      {
        edge,
        from: from.node,
        to: to.node,
        d: edgePath(from.rect, to.rect, offset, first, second),
      },
    ];
  });

  return {
    size: box,
    layers: graph.layers.map(({ layer }) => layer),
    nodes,
    edges,
  };
}

/** The widest layer side by side, and every band. */
function size(graph: Graph): Size {
  const perLayer = new Map<number, number>();
  for (const node of graph.nodes) {
    perLayer.set(node.layer, (perLayer.get(node.layer) ?? 0) + 1);
  }
  const maxPerLayer = Math.max(0, ...perLayer.values());
  return {
    W: maxPerLayer * PITCH + 2 * PADDING,
    H: graph.layers.length * BAND_HEIGHT + 2 * PADDING,
  };
}

/** Top edge of the band for `layer` (1-based). */
export function bandTop(layer: number): number {
  return PADDING + (layer - 1) * BAND_HEIGHT;
}

function nodeRect(node: GraphNode, { W }: Size): NodeRect {
  const cx = coord(PADDING + node.x * (W - 2 * PADDING));
  const cy = bandTop(node.layer) + BAND_HEIGHT / 2;
  return {
    x: coord(cx - NODE_WIDTH / 2),
    y: cy - NODE_HEIGHT / 2,
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    cx,
    cy,
  };
}

/**
 * An edge from `a` to `b`, shifted sideways by `offset` (perpendicular to the
 * line from `first` to `second`, so both directions agree on the side).
 *
 * Across layers: a straight line from boundary to boundary, so an arrowhead
 * at the end touches the target node instead of hiding under it. Within a
 * layer a straight line would run under the nodes in between, so the edge
 * leaves the bottom of `a` and arcs below the row into the bottom of `b`,
 * off centre (`ARC_INSET`).
 */
function edgePath(
  a: NodeRect,
  b: NodeRect,
  offset: number,
  first: NodeRect,
  second: NodeRect,
): string {
  if (a.cy === b.cy) {
    const span = Math.abs(b.cx - a.cx);
    const depth =
      Math.min(
        ARC_MAX_DEPTH,
        ARC_DEPTH + (ARC_DEPTH_PER_PITCH * span) / PITCH,
      ) +
      2 * offset;
    const toward = Math.sign(b.cx - a.cx) * ARC_INSET;
    const x0 = coord(a.cx + toward + offset);
    const x1 = coord(b.cx - toward + offset);
    const y = a.cy + NODE_HEIGHT / 2;
    const low = coord(y + depth);
    return `M${x0} ${y}C${x0} ${low} ${x1} ${low} ${x1} ${y}`;
  }
  const dx = b.cx - a.cx;
  const dy = b.cy - a.cy;
  const ux = second.cx - first.cx;
  const uy = second.cy - first.cy;
  const length = Math.hypot(ux, uy);
  const sx = (-uy / length) * offset;
  const sy = (ux / length) * offset;
  const t = exit(sx, sy, dx, dy);
  const u = exit(sx, sy, -dx, -dy);
  return `M${coord(a.cx + sx + t * dx)} ${coord(a.cy + sy + t * dy)}L${coord(b.cx + sx - u * dx)} ${coord(b.cy + sy - u * dy)}`;
}

/**
 * How far along `(dx, dy)` a point at `(px, py)` from a node's centre, inside
 * the node, travels before it crosses the node's boundary: the first of the
 * side or the top/bottom edge.
 */
function exit(px: number, py: number, dx: number, dy: number): number {
  return Math.min(
    dx === 0 ? Infinity : ((Math.sign(dx) * NODE_WIDTH) / 2 - px) / dx,
    dy === 0 ? Infinity : ((Math.sign(dy) * NODE_HEIGHT) / 2 - py) / dy,
  );
}

/** One decimal: below a pixel, and short in the HTML. */
function coord(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * At most `MAX_TITLE` characters (code points), ending in "…" when cut; at
 * font size 12 that fits the node width. The full title goes into `<title>`.
 */
export function truncateTitle(title: string): string {
  const chars = [...title];
  if (chars.length <= MAX_TITLE) return title;
  return `${chars
    .slice(0, MAX_TITLE - 1)
    .join("")
    .trimEnd()}…`;
}
