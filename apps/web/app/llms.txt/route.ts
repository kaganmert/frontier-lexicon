import { getPublishedConcepts } from "@/lib/concepts";
import { buildLlmsTxt } from "@/lib/seo/llms";

export const dynamic = "force-static";

export function GET() {
  return new Response(buildLlmsTxt(getPublishedConcepts()), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
