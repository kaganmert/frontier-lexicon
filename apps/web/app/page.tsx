import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { getConcepts } from "@/lib/concepts";
import { websiteJsonLd } from "@/lib/seo/jsonld";
import { siteDescription, siteName } from "@/lib/site";

export default function HomePage() {
  const concepts = getConcepts();
  return (
    <>
      <JsonLd data={websiteJsonLd()} />
      <h1 className="text-3xl font-semibold tracking-tight">{siteName}</h1>
      <p className="mt-4 text-lg">{siteDescription}</p>
      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">How it is organised</h2>
        <p>
          Concepts are nodes in a layered directed acyclic graph. A prerequisite
          edge always points from a lower layer to a higher one, so the graph
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
            <Link href="/concepts/" className="text-accent underline">
              Browse all {concepts.length} concepts
            </Link>
          </p>
        )}
      </section>
    </>
  );
}
