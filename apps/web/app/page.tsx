import type { Metadata } from "next";
import Link from "next/link";
import { conceptsIndexPath, getPublishedConcepts } from "@/lib/concepts";
import { OG_SITE, ogImageMeta, openGraphBase } from "@/lib/og";
import { siteDescription, siteName } from "@/lib/site";

const homeTitle = `${siteName} · a layered map of modern AI concepts`;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: {
    ...openGraphBase,
    type: "website",
    url: "/",
    title: homeTitle,
    description: siteDescription,
    images: ogImageMeta(OG_SITE, homeTitle),
  },
};

export default function HomePage() {
  const concepts = getPublishedConcepts();
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">{siteName}</h1>
      <p className="mt-4 text-lg">{siteDescription}</p>
      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">How it is organised</h2>
        <p>
          Concepts are nodes in a layered directed acyclic graph. A prerequisite
          edge never points from a higher layer to a lower one, so the graph
          doubles as a learning path. Other edges (measures, mitigates, causes,
          related to) carry the concept map itself.
        </p>
        <p>
          Every concept page has a plain-language theory, a hands-on exercise,
          its sources, and the concepts you need first. Each page is also
          published as plain Markdown for machines.
        </p>
      </section>
      <section className="mt-8">
        {concepts.length === 0 ? (
          <p className="rounded-md border border-border p-4 text-muted">
            No concepts have been published yet. The map appears here as soon as
            the first ones land.
          </p>
        ) : (
          <p>
            <Link href={conceptsIndexPath} className="text-accent underline">
              Browse all {concepts.length} concepts
            </Link>
          </p>
        )}
      </section>
    </>
  );
}
