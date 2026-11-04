import type { MetadataRoute } from "next";
import { robotsConfig } from "@/lib/seo/robots";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return robotsConfig();
}
