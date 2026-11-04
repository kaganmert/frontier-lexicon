import type { MetadataRoute } from "next";
import { conceptPath, getConcepts } from "@/lib/concepts";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    {
      url: absoluteUrl("/concepts/"),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...getConcepts().map((concept) => ({
      url: absoluteUrl(conceptPath(concept.slug)),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
