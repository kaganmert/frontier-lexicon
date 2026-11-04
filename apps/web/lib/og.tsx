import type { Metadata } from "next";
import { ImageResponse } from "next/og";
import { siteName } from "./site";

export const ogSize = { width: 1200, height: 630 };

/**
 * Next replaces a layout's `openGraph` wholesale when a page defines its own,
 * so every page spreads this base into its `openGraph` instead of inheriting.
 */
export const openGraphBase = {
  siteName,
  locale: "en_US",
} satisfies Metadata["openGraph"];

/** Image names: the two site-level cards, and `concepts/<slug>` per lesson. */
export const OG_SITE = "site";
export const OG_INDEX = "concepts";
export const conceptOgName = (slug: string) => `concepts/${slug}`;

/** Site-relative path of a page's OpenGraph image. */
export function ogPath(name: string): string {
  return `/og/${name}.png`;
}

/** `openGraph.images` entry for a page. */
export function ogImageMeta(name: string, alt: string) {
  return [
    { url: ogPath(name), width: ogSize.width, height: ogSize.height, alt },
  ];
}

type Props = { eyebrow?: string; title: string; subtitle?: string };

/** Shared OpenGraph card: dark background, eyebrow, big title, subtitle. */
export function ogImage({ eyebrow, title, subtitle }: Props) {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "#0a0a0a",
        color: "#ededed",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 28,
          color: "#9ca3af",
          letterSpacing: 2,
        }}
      >
        {eyebrow ?? siteName}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div
          style={{
            display: "flex",
            fontSize: 76,
            fontWeight: 700,
            lineHeight: 1.1,
          }}
        >
          {title}
        </div>
        {subtitle ? (
          <div
            style={{
              display: "flex",
              fontSize: 32,
              color: "#9ca3af",
              lineHeight: 1.4,
            }}
          >
            {subtitle}
          </div>
        ) : null}
      </div>
      <div style={{ display: "flex", fontSize: 24, color: "#6b7280" }}>
        {siteName}
      </div>
    </div>,
    ogSize,
  );
}
