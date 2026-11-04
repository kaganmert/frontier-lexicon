import { getConcept, getConcepts } from "@/lib/concepts";
import { ogImage, OG_INDEX, OG_SITE } from "@/lib/og";
import { layerName, siteDescription, siteName, trackLabel } from "@/lib/site";

/**
 * OpenGraph images, one PNG per page, rendered at build time:
 * `/og/site.png`, `/og/concepts.png` and `/og/<slug>.png`.
 *
 * A catch-all route handler is used instead of the `opengraph-image.tsx`
 * convention because Next does not allow that convention below an optional
 * catch-all page, and static export needs at least one generated path.
 */
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return [OG_SITE, OG_INDEX, ...getConcepts().map(({ slug }) => slug)].map(
    (name) => ({
      name: [`${name}.png`],
    }),
  );
}

export async function GET(
  _request: Request,
  { params }: RouteContext<"/og/[...name]">,
) {
  const { name } = await params;
  const key = name.join("/").replace(/\.png$/, "");

  if (key === OG_SITE)
    return ogImage({ title: siteName, subtitle: siteDescription });
  if (key === OG_INDEX) {
    return ogImage({
      title: "Concepts",
      subtitle: "Every concept, grouped by layer.",
    });
  }

  const concept = getConcept(key);
  if (!concept) return new Response("Not found", { status: 404 });
  return ogImage({
    eyebrow: `Layer ${concept.layer}: ${layerName(concept.layer)} · ${trackLabel[concept.track]}`,
    title: concept.title,
    subtitle: concept.description,
  });
}
