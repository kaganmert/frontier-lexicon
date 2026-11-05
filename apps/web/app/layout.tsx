import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { conceptsIndexPath } from "@/lib/concept-model";
import { websiteJsonLd } from "@/lib/seo/jsonld";
import { OG_SITE, ogImageMeta, openGraphBase } from "@/lib/og";
import { mapPath, siteDescription, siteName, siteUrl } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} · a layered map of modern AI concepts`,
    template: `%s · ${siteName}`,
  },
  description: siteDescription,
  // No canonical here: it would be inherited by routes without their own,
  // including the 404 page. Each page sets its own.
  openGraph: {
    ...openGraphBase,
    type: "website",
    images: ogImageMeta(
      OG_SITE,
      `${siteName}: a layered map of modern AI concepts`,
    ),
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      {/* A full-bleed `w-screen` element (the map) is as wide as the window
          including an always-visible vertical scrollbar, so it would scroll the
          page sideways. Clip only on pages that have one: elsewhere a wide
          table or code block must still scroll. */}
      <body className="flex min-h-full flex-col has-[[data-full-bleed]]:overflow-x-clip">
        <JsonLd data={websiteJsonLd()} />
        <header className="border-b border-border">
          <nav
            aria-label="Primary"
            className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3"
          >
            <Link href="/" className="font-semibold">
              {siteName}
            </Link>
            <ul className="flex gap-4 text-sm">
              <li>
                <Link href={mapPath}>Map</Link>
              </li>
              <li>
                <Link href={conceptsIndexPath}>Concepts</Link>
              </li>
              <li>
                <a href="/llms.txt">llms.txt</a>
              </li>
            </ul>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-border">
          <div className="mx-auto w-full max-w-3xl px-4 py-6 text-sm text-muted">
            <p>
              Code is AGPL-3.0-only. Content (concept texts, exercises and graph
              data) is CC BY-NC-SA 4.0.{" "}
              <a
                href="https://github.com/kaganmert/frontier-lexicon"
                className="underline"
              >
                Source on GitHub
              </a>
              .
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
