import { MDXContent } from "@content-collections/mdx/react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import {
  conceptEyebrow,
  conceptMarkdownPath,
  conceptPath,
  conceptsIndexPath,
  getConcept,
  getConcepts,
  groupByLayer,
  groupByTrack,
  type Concept,
} from "@/lib/concepts";
import { OG_INDEX, ogImageMeta } from "@/lib/og";
import {
  breadcrumbJsonLd,
  definedTermJsonLd,
  definedTermSetJsonLd,
} from "@/lib/seo/jsonld";
import { absoluteUrl, layerHeading, trackLabel } from "@/lib/site";

/**
 * `/concepts/` (index) and `/concepts/<slug>/` (lesson) share this optional
 * catch-all so that static export always has at least one path to generate,
 * even before the first concept exists.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return [{ slug: [] }, ...getConcepts().map(({ slug }) => ({ slug: [slug] }))];
}

const indexMetadata: Metadata = {
  title: "Concepts",
  description:
    "Every concept in frontier-lexicon, grouped by layer from model fundamentals to research vocabulary.",
  alternates: { canonical: conceptsIndexPath },
  openGraph: {
    url: conceptsIndexPath,
    title: "Concepts",
    images: ogImageMeta(
      OG_INDEX,
      "frontier-lexicon concepts, grouped by layer",
    ),
  },
};

type Target =
  | { kind: "index" }
  | { kind: "lesson"; concept: Concept }
  | { kind: "missing" };

/** Resolve the catch-all param to what the page should show. */
function resolveTarget(slug: string[] | undefined): Target {
  if (!slug || slug.length === 0) return { kind: "index" };
  const concept = slug.length === 1 ? getConcept(slug[0]) : undefined;
  return concept ? { kind: "lesson", concept } : { kind: "missing" };
}

export async function generateMetadata({
  params,
}: PageProps<"/concepts/[[...slug]]">): Promise<Metadata> {
  const target = resolveTarget((await params).slug);
  if (target.kind === "index") return indexMetadata;
  if (target.kind === "missing") return {};
  const { concept } = target;
  return {
    title: concept.title,
    description: concept.description,
    alternates: {
      canonical: conceptPath(concept.slug),
      types: {
        "text/markdown": absoluteUrl(conceptMarkdownPath(concept.slug)),
      },
    },
    openGraph: {
      type: "article",
      url: conceptPath(concept.slug),
      title: concept.title,
      description: concept.description,
      images: ogImageMeta(concept.slug, concept.title),
    },
  };
}

export default async function ConceptsRoute({
  params,
}: PageProps<"/concepts/[[...slug]]">) {
  const target = resolveTarget((await params).slug);
  if (target.kind === "missing") notFound();
  if (target.kind === "index") return <ConceptIndex />;
  return <ConceptLesson concept={target.concept} />;
}

function ConceptIndex() {
  const concepts = getConcepts();

  return (
    <>
      <JsonLd data={definedTermSetJsonLd(concepts)} />
      <h1 className="text-3xl font-semibold tracking-tight">Concepts</h1>
      <p className="mt-2 text-muted">
        Grouped by layer, then by track. Lower layers are prerequisites for
        higher ones.
      </p>
      {concepts.length === 0 ? (
        <p className="mt-8 rounded-md border border-border p-4 text-muted">
          No concepts have been published yet.
        </p>
      ) : (
        [...groupByLayer(concepts)].map(([layer, members]) => (
          <section key={layer} className="mt-8">
            <h2 className="text-xl font-semibold">{layerHeading(layer)}</h2>
            {[...groupByTrack(members)].map(([track, inTrack]) => (
              <div key={track} className="mt-3">
                <h3 className="text-xs uppercase tracking-wide text-muted">
                  {trackLabel[track]}
                </h3>
                <ul className="mt-1 space-y-2">
                  {inTrack.map((concept) => (
                    <li key={concept.slug}>
                      <Link
                        href={conceptPath(concept.slug)}
                        className="text-accent underline"
                      >
                        {concept.title}
                      </Link>
                      <p className="text-sm text-muted">
                        {concept.description}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ))
      )}
    </>
  );
}

/** MDX bodies may call React components; none are registered yet. */
const components = {};

function ConceptLesson({ concept }: { concept: Concept }) {
  return (
    <article>
      <JsonLd data={definedTermJsonLd(concept)} />
      <JsonLd data={breadcrumbJsonLd(concept)} />
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <ol className="flex gap-2">
          <li>
            <Link href="/">Home</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={conceptsIndexPath}>Concepts</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">{concept.title}</li>
        </ol>
      </nav>
      <header className="mt-4">
        <p className="text-xs uppercase tracking-wide text-muted">
          {conceptEyebrow(concept)}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          {concept.title}
        </h1>
        <p className="mt-3 text-lg text-muted">{concept.description}</p>
      </header>
      <div className="prose mt-8">
        <MDXContent code={concept.mdx} components={components} />
      </div>
      <footer className="mt-10 border-t border-border pt-4 text-sm text-muted">
        <a href={conceptMarkdownPath(concept.slug)} type="text/markdown">
          View this page as Markdown
        </a>
      </footer>
    </article>
  );
}
