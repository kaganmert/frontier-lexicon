# web

The frontier-lexicon site: Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind v4. Output is fully static.

## Commands

Run from the repo root with the local turbo:

| Command                                      | What it does                                                               |
| -------------------------------------------- | -------------------------------------------------------------------------- |
| `pnpm exec turbo run dev --filter=web`       | Dev server with live reload of `content/concepts/**`                       |
| `pnpm exec turbo run build --filter=web`     | Static export into `apps/web/out/`                                         |
| `pnpm exec turbo run check --filter=web`     | `next typegen` then `tsc --noEmit` (route types and content types)         |
| `pnpm exec turbo run lint test --filter=web` | ESLint and Vitest                                                          |
| `pnpm exec turbo run format --filter=web`    | Prettier (writes); `format:check` is the read-only variant CI runs         |
| `pnpm exec turbo run generate --filter=web`  | Only the content build: `.content-collections/` and `public/concepts/*.md` |

## Configuration

- `NEXT_PUBLIC_SITE_URL`: absolute `http(s)` URL of the deployed site, no trailing slash. Default `https://lexicon.kaganmert.com`. Anything else fails the build with a message. Every absolute URL (canonical, sitemap, OpenGraph, JSON-LD, `llms.txt`) derives from it via `lib/site.ts`.
- Build output: `apps/web/out/`. On Vercel set the root directory to `apps/web`; the framework preset detects Next.js and the static export.

## Content

Concept files live outside this package, in `content/concepts/<slug>.mdx` (CC BY-NC-SA 4.0). They are loaded with [Content Collections](https://www.content-collections.dev/); the config is `content-collections.ts`.

Front matter validated here, on purpose minimal (the full schema is fixed together with the Rust engine in `crates/lexicon-core`):

```yaml
---
title: Context window # required, single line
description: One or two sentences, max 160 characters. # required, single line, used as meta description
layer: 2 # 1–10
track: shared # coding | research | shared
slug: context-window # optional; must equal the file name if present
---
```

Any other field (`question`, `prerequisites`, `edges`, `sources`, `provenance`) passes through untouched. Bodies start at H2; the page renders the title as the only H1. Files sit directly in `content/concepts/` and are named `<slug>.mdx` with a lowercase kebab-case slug; subdirectories and other file names fail the build. Invalid front matter fails the build with the file name.

With an empty `content/concepts/` the build still succeeds: the home page, `/concepts/`, `sitemap.xml`, `robots.txt`, `llms.txt`, `llms-full.txt` and the site OG image are all produced, with explicit empty states.

To add a concept: create `content/concepts/<slug>.mdx`, run the build. Nothing in this package needs to change.

## Routes and generated files

| Path                                                          | Source                                                |
| ------------------------------------------------------------- | ----------------------------------------------------- |
| `/`                                                           | `app/page.tsx`                                        |
| `/concepts/`                                                  | `app/concepts/[[...slug]]/page.tsx` (index)           |
| `/concepts/<slug>/`                                           | same file (lesson)                                    |
| `/concepts/<slug>/index.md`                                   | written by `content-collections.ts`                   |
| `/og/site.png`, `/og/concepts.png`, `/og/concepts/<slug>.png` | `app/og/[...name]/route.ts`                           |
| `/sitemap.xml`, `/robots.txt`                                 | `app/sitemap.ts`, `app/robots.ts`                     |
| `/llms.txt`, `/llms-full.txt`                                 | `app/llms.txt/route.ts`, `app/llms-full.txt/route.ts` |

Pure helpers behind these live in `lib/seo/` (JSON-LD builders, `llms.txt` generators, robots rules, Markdown rendering) and are unit-tested with Vitest.

## Decisions and constraints

- **Static export, Cache Components off.** `output: "export"` and Next 16's `cacheComponents` cannot be combined (`Invariant: PPR cannot be enabled in export mode`). `create-next-app` enables Cache Components by default; `next.config.ts` turns it off.
- **`trailingSlash: true`.** Every page is a directory with `index.html`, so the Markdown alternate sits next to it as `index.md`.
- **Markdown alternates are files in `public/`, not a route.** Static export refuses a dynamic route whose `generateStaticParams` is empty, which is the case before the first concept exists. The `onSuccess` hook in `content-collections.ts` writes `public/concepts/<slug>/index.md` (cleaned on every build, git-ignored) and Next copies `public/` into `out/`. The page advertises it with `<link rel="alternate" type="text/markdown">`. A dotted dynamic segment (`/concepts/<slug>.md`) is not expressible in the App Router, so the documented fallback path is the one shipped.
- **One optional catch-all for the concept routes.** `/concepts/` and `/concepts/<slug>/` share `app/concepts/[[...slug]]/page.tsx` so there is always at least one static param.
- **OpenGraph images through one route handler.** Next does not allow the `opengraph-image.tsx` convention below an optional catch-all, so `/og/<name>.png` renders all cards with `next/og` at build time (`concepts/<slug>` for lessons, so no slug can collide with the site-level cards). Pages reference them explicitly in `openGraph.images`.
- **The Markdown alternate is the raw MDX body.** With no components registered this is plain Markdown. Once bodies start using `import` or JSX, the writer in `content-collections.ts` must strip or render those before the `.md` and `llms-full.txt` outputs are still plain.
- **Metadata is set per page, not inherited.** Next replaces a layout's `openGraph` wholesale when a page defines its own, and a layout-level `canonical` would leak onto the 404 page. `lib/og.tsx` exports `openGraphBase`; every page spreads it and sets its own canonical.
- **No third-party requests.** System font stack, no analytics, no external scripts. The only external links are plain anchors.
- **`robots.txt`** allows everyone and lists the AI crawlers by their documented tokens: `GPTBot`, `OAI-SearchBot`, `ClaudeBot`, `Claude-SearchBot`, `Google-Extended`, `PerplexityBot`, `CCBot`.
- **`llms.txt`** follows [llmstxt.org](https://llmstxt.org/). No major AI vendor commits to reading it; it costs nothing and the real wins are clean HTML, the sitemap, the robots rules and the per-page Markdown.
- **JSON-LD** uses schema.org `WebSite`, `DefinedTermSet`, `DefinedTerm` and `BreadcrumbList`. Google shows no rich result for defined terms; the markup is there for semantic clarity, not traffic.
