import { conceptPath } from "../lib/concept-model";
import type { EdgeType, Graph, GraphEdge, GraphNode } from "../lib/graph";
import {
  bandTop,
  BAND_HEIGHT,
  edgePath,
  FONT_SIZE,
  LABEL_BASELINE,
  nodeRect,
  type NodeRect,
  PADDING,
  size,
  truncateTitle,
} from "../lib/map-layout";

/**
 * The concept map as plain SVG, rendered on the server. No `next/*` imports,
 * so it also renders under `react-dom/server` in Vitest. Published nodes are
 * ordinary SVG links; `next/link` would drop the trailing slash outside a
 * router and buys nothing here.
 */
export function MapGraph({ graph }: { graph: Graph }) {
  const box = size(graph);
  const bySlug = new Map(graph.nodes.map((node) => [node.slug, node]));

  return (
    <svg
      role="group"
      aria-label="Concept map"
      viewBox={`0 0 ${box.W} ${box.H}`}
      width={box.W}
      height={box.H}
      fontSize={FONT_SIZE}
      className="block"
    >
      <defs>
        <marker
          id="map-arrow"
          viewBox="0 0 10 10"
          refX="10"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto"
        >
          <path d="M0 0L10 5L0 10z" className="fill-muted" />
        </marker>
      </defs>
      <g>
        {graph.layers.map(({ layer, name }) => (
          <g key={layer}>
            <rect
              x={0}
              y={bandTop(layer)}
              width={box.W}
              height={BAND_HEIGHT}
              className={
                layer % 2 === 0 ? "fill-foreground/[0.03]" : "fill-transparent"
              }
            />
            <text
              x={PADDING}
              y={bandTop(layer) + LABEL_BASELINE}
              className="fill-muted"
            >{`Layer ${layer}: ${name}`}</text>
          </g>
        ))}
      </g>
      <g>
        {graph.edges.map((edge) => {
          const from = bySlug.get(edge.from);
          const to = bySlug.get(edge.to);
          if (!from || !to) return null;
          return (
            <MapEdge
              key={`${edge.from} ${edge.to} ${edge.type}`}
              edge={edge}
              from={from}
              to={to}
              d={edgePath(from, to, box)}
            />
          );
        })}
      </g>
      <g>
        {graph.nodes.map((node) => (
          <MapNode key={node.slug} node={node} rect={nodeRect(node, box)} />
        ))}
      </g>
    </svg>
  );
}

/** Line and node styles, shared by the map and its legend. */
const PREREQUISITE_STROKE = 1.25;
const RELATION_DASH = "4 4";
const DRAFT_DASH = "3 3";

/** Hover text of a dashed edge: plain words, not the `graph.json` type. */
const relationLabel: Record<Exclude<EdgeType, "PREREQUISITE_OF">, string> = {
  MEASURES: "measures",
  MITIGATES: "mitigates",
  CAUSES: "causes",
  RELATED_TO: "related to",
};

function MapEdge({
  edge,
  from,
  to,
  d,
}: {
  edge: GraphEdge;
  from: GraphNode;
  to: GraphNode;
  d: string;
}) {
  if (edge.type === "PREREQUISITE_OF") {
    return (
      <path
        d={d}
        fill="none"
        className="stroke-muted"
        strokeWidth={PREREQUISITE_STROKE}
        markerEnd="url(#map-arrow)"
      />
    );
  }
  return (
    <path
      d={d}
      fill="none"
      className="stroke-muted"
      strokeWidth={1}
      strokeDasharray={RELATION_DASH}
      opacity={0.7}
    >
      <title>{`${from.title} ${relationLabel[edge.type]} ${to.title}`}</title>
    </path>
  );
}

const nodeStyle = {
  published: {
    rect: "fill-background stroke-accent",
    dash: undefined,
    text: "fill-foreground",
  },
  draft: {
    rect: "fill-background stroke-border",
    dash: DRAFT_DASH,
    text: "fill-muted",
  },
} as const;

function MapNode({ node, rect }: { node: GraphNode; rect: NodeRect }) {
  const style = nodeStyle[node.status];
  const shape = (
    <>
      <rect
        x={rect.x}
        y={rect.y}
        width={rect.width}
        height={rect.height}
        rx={6}
        className={style.rect}
        strokeDasharray={style.dash}
      />
      <text
        x={rect.cx}
        y={rect.cy}
        textAnchor="middle"
        dominantBaseline="central"
        className={style.text}
      >
        {truncateTitle(node.title)}
      </text>
    </>
  );

  if (node.status === "published") {
    return (
      <a data-node={node.slug} href={conceptPath(node.slug)}>
        <title>{node.title}</title>
        {shape}
      </a>
    );
  }
  return (
    <g data-node={node.slug}>
      <title>{`${node.title}: not published yet`}</title>
      {shape}
    </g>
  );
}

/** What the line and node styles mean; HTML, so it stays put while the map scrolls. */
export function MapLegend() {
  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
      <li className="flex items-center gap-2">
        <svg width="32" height="10" aria-hidden="true">
          <line
            x1="0"
            y1="5"
            x2="26"
            y2="5"
            className="stroke-muted"
            strokeWidth={PREREQUISITE_STROKE}
          />
          <path d="M24 1L32 5L24 9z" className="fill-muted" />
        </svg>
        Prerequisite (points to the concept that needs it)
      </li>
      <li className="flex items-center gap-2">
        <svg width="32" height="10" aria-hidden="true">
          <line
            x1="0"
            y1="5"
            x2="32"
            y2="5"
            className="stroke-muted"
            strokeDasharray={RELATION_DASH}
          />
        </svg>
        Measures, mitigates, causes or related to
      </li>
      <li className="flex items-center gap-2">
        <svg width="32" height="14" aria-hidden="true">
          <rect
            x="1"
            y="1"
            width="30"
            height="12"
            rx="3"
            className={nodeStyle.draft.rect}
            strokeDasharray={DRAFT_DASH}
          />
        </svg>
        Not published yet
      </li>
    </ul>
  );
}
