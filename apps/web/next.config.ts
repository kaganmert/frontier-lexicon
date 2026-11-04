import type { NextConfig } from "next";
import { withContentCollections } from "@content-collections/next";

const nextConfig: NextConfig = {
  // Fully static output: plain HTML that any host can serve. Decided in FLN-02.
  output: "export",
  // Next 16 refuses `output: "export"` together with Cache Components
  // ("Invariant: PPR cannot be enabled in export mode"), so it stays off.
  cacheComponents: false,
  // Every page is emitted as `<path>/index.html`, so `/concepts/<slug>/` maps to
  // a directory. This keeps the `.md` alternate at `/concepts/<slug>/index.md`
  // next to the HTML on any static host.
  trailingSlash: true,
  // Static export cannot run the default image optimizer.
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withContentCollections(nextConfig);
