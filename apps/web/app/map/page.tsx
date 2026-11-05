import type { Metadata } from "next";
import { MapGraph, MapLegend } from "@/components/map-graph";
import { MapViewport } from "@/components/map-viewport";
import { graph } from "@/lib/graph";
import { size } from "@/lib/map-layout";
import { OG_MAP, ogImageMeta, openGraphBase } from "@/lib/og";
import { mapPath } from "@/lib/site";

const description =
  "Every concept in frontier-lexicon as one layered diagram: what comes before what, from model fundamentals to research vocabulary.";

export const metadata: Metadata = {
  title: "Map",
  description,
  alternates: { canonical: mapPath },
  openGraph: {
    ...openGraphBase,
    type: "website",
    url: mapPath,
    title: "Map",
    description,
    images: ogImageMeta(OG_MAP, "The frontier-lexicon concept map"),
  },
};

export default function MapPage() {
  const box = size(graph);
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Map</h1>
      <p className="mt-2 text-muted">
        One row per layer, from model fundamentals at the top to research
        vocabulary at the bottom. An arrow points from a concept to one that
        builds on it. Published concepts are links; the others are planned.
      </p>
      {graph.nodes.length === 0 ? (
        <p className="mt-8 rounded-md border border-border p-4 text-muted">
          The map is empty: no concepts have been added to the graph yet.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          <MapLegend />
          <MapViewport width={box.W} height={box.H}>
            <MapGraph graph={graph} />
          </MapViewport>
        </div>
      )}
    </>
  );
}
