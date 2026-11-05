import type { Graph, GraphNode } from "./graph";

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

export type Size = { W: number; H: number };

export type NodeRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  cx: number;
  cy: number;
};

/** The `viewBox` size: the widest layer side by side, and every band. */
export function size(graph: Graph): Size {
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

export function nodeRect(node: GraphNode, { W }: Size): NodeRect {
  const cx = PADDING + node.x * (W - 2 * PADDING);
  const cy = bandTop(node.layer) + BAND_HEIGHT / 2;
  return {
    x: cx - NODE_WIDTH / 2,
    y: cy - NODE_HEIGHT / 2,
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    cx,
    cy,
  };
}

/**
 * SVG path data for a straight edge from `from` to `to`, starting and ending
 * where the line between the centres crosses each node's boundary, so an
 * arrowhead at the end touches the target node instead of hiding under it.
 */
export function edgePath(from: GraphNode, to: GraphNode, size: Size): string {
  const a = nodeRect(from, size);
  const b = nodeRect(to, size);
  const dx = b.cx - a.cx;
  const dy = b.cy - a.cy;
  // Fraction of the centre-to-centre vector that lies inside one node: the
  // first of the side or the top/bottom boundary the line meets.
  const t = Math.min(
    dx === 0 ? Infinity : NODE_WIDTH / 2 / Math.abs(dx),
    dy === 0 ? Infinity : NODE_HEIGHT / 2 / Math.abs(dy),
  );
  const start = [a.cx + t * dx, a.cy + t * dy];
  const end = [b.cx - t * dx, b.cy - t * dy];
  return `M${coord(start[0])} ${coord(start[1])}L${coord(end[0])} ${coord(end[1])}`;
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
