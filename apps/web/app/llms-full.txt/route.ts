import { getConcepts } from "@/lib/concepts";
import { buildLlmsFullTxt } from "@/lib/seo/llms";

export const dynamic = "force-static";

export function GET() {
  return new Response(buildLlmsFullTxt(getConcepts()), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
