import type { MetadataRoute } from "next";
import { absoluteUrl } from "../site";

/**
 * User agents of the AI crawlers we explicitly welcome, by their documented
 * robots.txt tokens. `Google-Extended` is a control token rather than a
 * crawler, but it is what Google reads for Gemini grounding.
 */
export const aiCrawlers = [
  "GPTBot",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-SearchBot",
  "Google-Extended",
  "PerplexityBot",
  "CCBot",
] as const;

export function robotsConfig(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      { userAgent: [...aiCrawlers], allow: "/" },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
