import { MDXContent } from "@content-collections/mdx/react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import {
  conceptMarkdownPath,
  conceptPath,
  getConcept,
  getConcepts,
} from "@/lib/concepts";
import {
  breadcrumbJsonLd,
  definedTermJsonLd,
  definedTermSetJsonLd,
} from "@/lib/seo/jsonld";
import { OG_INDEX, ogImageMeta } from "@/lib/og";
import { absoluteUrl, layerName, trackLabel } from "@/lib/site";

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
  alternates: { canonical: "/concepts/" },
  openGraph: {
    url: "/concepts/",
    title: "Concepts",
    images: ogImageMeta(
      OG_INDEX,
      "frontier-lexicon concepts, grouped by layer",
    ),
  },
};

function slugOf(slug: string[] | undefined): string | undefined {
  if (!slug || slug.length === 0) return undefined;
  if (slug.length > 1) notFound();
  return slug[0];
}

export async function generateMetadata({
  params,
}: PageProps<"/concepts/[[...slug]]">): Promise<Metadata> {
  const slug = slugOf((await params).slug);
  if (slug === undefined) return indexMetadata;
  const concept = getConcept(slug);
  if (!concept) return {};
  return {
    title: concept.title,
    description: concept.description,
    alternates: {
      canonical: conceptPath(slug),
      types: { "text/markdown": absoluteUrl(conceptMarkdownPath(slug)) },
    },
    openGraph: {
      type: "article",
      url: conceptPath(slug),
      title: concept.title,
      description: concept.description,
      images: ogImageMeta(slug, concept.title),
    },
  };
}

export default async function ConceptsRoute({
  params,
}: PageProps<"/concepts/[[...slug]]">) {
  const slug = slugOf((await params).slug);
  if (slug === undefined) return <ConceptIndex />;
  const concept = getConcept(slug);
  if (!concept) notFound();
  return <ConceptLesson concept={concept} />;
}

function ConceptIndex() {
  const concepts = getConcepts();
  const layers = new Map<number, typeof concepts>();
  for (const concept of concepts) {
    layers.set(concept.layer, [...(layers.get(concept.layer) ?? []), concept]);
  }

  return (
    <>
      <JsonLd data={definedTermSetJsonLd(concepts)} />
      <h1 className="text-3xl font-semibold tracking-tight">Concepts</h1>
      <p className="mt-2 text-muted">
        Grouped by layer. Lower layers are prerequisites for higher ones.
      </p>
      {concepts.length === 0 ? (
        <p className="mt-8 rounded-md border border-border p-4 text-muted">
          No concepts have been published yet.
        </p>
      ) : (
        [...layers.entries()].map(([layer, members]) => (
          <section key={layer} className="mt-8">
            <h2 className="text-xl font-semibold">
              Layer {layer}: {layerName(layer)}
            </h2>
            <ul className="mt-3 space-y-2">
              {members.map((concept) => (
                <li key={concept.slug}>
                  <Link
                    href={conceptPath(concept.slug)}
                    className="text-accent underline"
                  >
                    {concept.title}
                  </Link>{" "}
                  <span className="text-xs uppercase tracking-wide text-muted">
                    {trackLabel[concept.track]}
                  </span>
                  <p className="text-sm text-muted">{concept.description}</p>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </>
  );
}

/** MDX bodies may call React components; none are registered yet. */
const components = {};

function ConceptLesson({
  concept,
}: {
  concept: NonNullable<ReturnType<typeof getConcept>>;
}) {
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
            <Link href="/concepts/">Concepts</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">{concept.title}</li>
        </ol>
      </nav>
      <header className="mt-4">
        <p className="text-xs uppercase tracking-wide text-muted">
          Layer {concept.layer}: {layerName(concept.layer)} ·{" "}
          {trackLabel[concept.track]}
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
