import { conceptPath } from "../lib/concept-model";
import type { Graph, GraphEdge, GraphNode } from "../lib/graph";
import {
  bandTop,
  BAND_HEIGHT,
  edgePath,
  FONT_SIZE,
  nodeRect,
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
              y={bandTop(layer) + 18}
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

function MapEdge({ edge, d }: { edge: GraphEdge; d: string }) {
  if (edge.type === "PREREQUISITE_OF") {
    return (
      <path
        d={d}
        fill="none"
        className="stroke-muted"
        strokeWidth={1.25}
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
      strokeDasharray="4 4"
      opacity={0.7}
    >
      <title>{edge.type}</title>
    </path>
  );
}

function MapNode({
  node,
  rect,
}: {
  node: GraphNode;
  rect: ReturnType<typeof nodeRect>;
}) {
  const box = (
    <>
      <rect
        x={rect.x}
        y={rect.y}
        width={rect.width}
        height={rect.height}
        rx={6}
        className={
          node.status === "published"
            ? "fill-background stroke-accent"
            : "fill-background stroke-border"
        }
        strokeDasharray={node.status === "published" ? undefined : "3 3"}
      />
      <text
        x={rect.cx}
        y={rect.cy}
        textAnchor="middle"
        dominantBaseline="central"
        className={
          node.status === "published" ? "fill-foreground" : "fill-muted"
        }
      >
        {truncateTitle(node.title)}
      </text>
    </>
  );

  if (node.status === "published") {
    return (
      <a data-node={node.slug} href={conceptPath(node.slug)}>
        <title>{node.title}</title>
        {box}
      </a>
    );
  }
  return (
    <g data-node={node.slug}>
      <title>{`${node.title}: not published yet`}</title>
      {box}
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
            strokeWidth={1.25}
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
            strokeDasharray="4 4"
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
            className="fill-background stroke-border"
            strokeDasharray="3 3"
          />
        </svg>
        Not published yet
      </li>
    </ul>
  );
}
