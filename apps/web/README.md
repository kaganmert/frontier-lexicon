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
- Build output: `apps/web/out/`.

### Vercel

The site is the Vercel project `frontier-lexicon` in the Hobby team `kagans-projects-9f4a9e36`, the team that also owns `kaganmert.com`. It is connected to this repository through the Vercel Git integration: every push to `main` deploys to production, every pull request gets a preview deployment, a deployment status check and a comment with the preview URL. The Vercel check is not a required status check on `main`; only the CI jobs `web` and `rust` are.

| Setting                                         | Value                                                                             |
| ----------------------------------------------- | --------------------------------------------------------------------------------- |
| Framework preset                                | Next.js                                                                           |
| Root Directory                                  | `apps/web`                                                                        |
| Include source files outside the Root Directory | on (the build reads `../../content/concepts`)                                     |
| Skip deployment (monorepo)                      | on, the default; Ignored Build Step empty                                         |
| Install / build command                         | framework defaults: `pnpm install`, then `turbo run build` (Vercel detects Turbo) |
| Node.js                                         | 24.x, matching `engines.node` in the root package.json                            |
| Vercel Authentication                           | off, so previews are public and reachable with `curl`                             |

| Environment variable           | Environments                     | Value                           |
| ------------------------------ | -------------------------------- | ------------------------------- |
| `ENABLE_EXPERIMENTAL_COREPACK` | production, preview, development | `1`                             |
| `NEXT_PUBLIC_SITE_URL`         | production                       | `https://lexicon.kaganmert.com` |

- **Build command.** Vercel detects Turborepo and runs `turbo run build` scoped to `web`, not plain `next build`. That runs `generate`, `check` and `build` in order (see `turbo.json`), so a type error fails the deployment, and Vercel provides the Turbo remote cache.
- **`web#build` caches `.next/**` as well as `out/**`** (minus `.next/cache/**` and the dev server's `.next/dev/**`). A commit that does not touch the web inputs, such as a `content/README.md` or Rust change, is a full Turbo cache hit on Vercel, and Vercel's Next.js builder then needs `.next/routes-manifest.json`; with only `out/**` cached that deployment fails with `NEXT_NO_ROUTES_MANIFEST`.
- **Corepack** makes Vercel install exactly the pnpm version pinned in `packageManager`; without the variable Vercel still reads the field but uses whatever pnpm of that major it bundles. The variable is listed in `globalPassThroughEnv` in `turbo.json`: no task reads it, and without that entry turbo's strict env mode warns on every Vercel build. Corepack is not shipped with Node 25 and later, so check that Vercel's newer image still provides it before raising `engines.node`.
- **Previews** carry no `NEXT_PUBLIC_SITE_URL`: the default in `lib/site.ts` is the production origin, and Vercel sends `X-Robots-Tag: noindex` on `*.vercel.app` preview URLs, so preview canonicals pointing at production are what we want.
- **Content-only commits deploy.** `content/` and `crates/` are outside the pnpm workspace, so Vercel's skip logic treats changes there as global.
- **Domain.** `lexicon.kaganmert.com` is a DNS record at Namecheap (BasicDNS for `kaganmert.com`): `CNAME lexicon → ea5904d97cc7d5c6.vercel-dns-017.com.` This target is specific to the project; take it from the project's Domains page if the project is ever recreated.

## Content

Concept files live outside this package, in `content/concepts/<slug>.mdx` (CC BY-NC-SA 4.0). They are loaded with [Content Collections](https://www.content-collections.dev/); the config is `content-collections.ts`.

The front matter contract (every field, the file naming and delimiting rules, an example) is documented once, in [`content/README.md`](../../content/README.md), and implemented in full by `crates/lexicon-core`. The site deliberately validates only the subset it needs to render a page (`lib/concept-schema.ts`): `title`, `description`, `layer`, `track`, `status` and the optional `slug`. Every other field passes through untouched.

Only `status: published` concepts reach the public site. Drafts are dropped with `publishedOnly` (`lib/concept-model.ts`) in exactly two places: `lib/concepts.ts`, which exports only `getPublishedConcepts()` and `getConcept(slug)` to every page and route, and the Markdown alternates writer in `content-collections.ts`, which runs before Next. So no draft page, `.md` file, OG image, sitemap entry, `llms.txt` or `llms-full.txt` line, and no draft `description` or `question`, ever lands in `out/`. The concept map (FLN-09) reads `graph.json` instead and may show draft titles.

Bodies start at H2; the page renders the title as the only H1. Files sit directly in `content/concepts/` and are named `<slug>.mdx` with a lowercase kebab-case slug; subdirectories and other file names fail the build. Invalid front matter fails the build with the file name.

With an empty `content/concepts/` the build still succeeds: the home page, `/concepts/`, `sitemap.xml`, `robots.txt`, `llms.txt`, `llms-full.txt` and the site OG image are all produced, with explicit empty states. `/map/` reads the committed `content/graph.json` instead and shows its own empty state when that file has no nodes.

To add a concept: create `content/concepts/<slug>.mdx`, run the build. Nothing in this package needs to change.

## Routes and generated files

| Path                                                          | Source                                                |
| ------------------------------------------------------------- | ----------------------------------------------------- |
| `/`                                                           | `app/page.tsx`                                        |
| `/concepts/`                                                  | `app/concepts/[[...slug]]/page.tsx` (index)           |
| `/concepts/<slug>/`                                           | same file (lesson)                                    |
| `/concepts/<slug>/index.md`                                   | written by `content-collections.ts`                   |
| `/map/`                                                       | `app/map/page.tsx`                                    |
| `/og/site.png`, `/og/concepts.png`, `/og/concepts/<slug>.png` | `app/og/[...name]/route.ts`                           |
| `/og/map.png`                                                 | same file                                             |
| `/sitemap.xml`, `/robots.txt`                                 | `app/sitemap.ts`, `app/robots.ts`                     |
| `/llms.txt`, `/llms-full.txt`                                 | `app/llms.txt/route.ts`, `app/llms-full.txt/route.ts` |

Pure helpers behind these live in `lib/seo/` (JSON-LD builders, `llms.txt` generators, robots rules, Markdown rendering) and are unit-tested with Vitest, as are `lib/graph.ts` (the parsed `graph.json`), `lib/map-layout.ts` (map geometry), `components/map-graph.tsx` (rendered with `react-dom/server`) and the wheel zoom step in `components/map-viewport.tsx`.

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
- **Drafts are invisible to the public site.** The graph is seeded as `status: draft` front matter long before any lesson text exists, and the site is live. Pages and routes get concept documents only from `lib/concepts.ts`, which has no unfiltered accessor, so a new route cannot forget the filter (see Content for the two filter points). The one exception is `/map/`: it reads `graph.json` through `lib/graph.ts`, which carries titles but no descriptions or questions, shows draft titles, and links a node only when its `status` there is `published` (CI's `lexicon build --check` keeps that in step with the front matter). Draft front matter is still compiled into the server bundle under `.next/`; only `out/` is deployed.
- **Concept order is (layer, track, slug).** Slugs compare by code unit, the same byte order `lexicon-core` uses, so the site and `graph.json` list concepts identically. Titles are not used: `localeCompare` depends on the runtime's ICU data.
- **The map is server-rendered SVG in fixed units.** `/map/` draws `content/graph.json` (written by `lexicon build`, so the site never needs Rust) as plain SVG on the server: no graph or canvas library, no layout in the browser. One unit is one CSS pixel at zoom 1: nodes are 160×36 with a 24 gap, bands 120 high, padding 24, so the width follows the widest layer. The server cannot measure text, so titles are cut at 20 characters with "…" and the full title is the node's `<title>`. Node `x` comes from `graph.json`; the vertical position comes from the layer's band, not `y`. `lib/map-layout.ts` computes the size, node boxes and edge paths once (`layoutMap`), and the page sizes the viewport from the same result. Edges between layers are straight lines between node boundaries; one spanning several layers crosses the bands in between. An edge within a layer would run under the nodes in between, so it leaves the bottom of one node and arcs below the row into the bottom of the other, deeper the longer it is; it leaves and enters a quarter of the node width off centre, so it does not merge with a vertical edge. Two edges between the same nodes (say a prerequisite one way and `MITIGATES` the other) are drawn side by side. Published nodes are plain SVG `<a>` (not `next/link`, which drops the trailing slash outside a router); drafts show their title only, since `graph.json` carries no draft text. `lib/graph.ts` parses the file with zod at module load, so a malformed file fails the build with the field that is wrong; it also checks what the drawing relies on and `lexicon-core` guarantees: layers numbered 1, 2, 3, … with every node in one of them, unique slugs, and edges between two different, existing nodes.
- **One hand-written client component, and it gets no graph.** `components/map-viewport.tsx` is the app's only `"use client"` file. The static export repeats every client prop in the RSC payload (`index.html`, `index.txt`, `__next.*.txt`), so it receives the server-rendered SVG as `children` and two numbers, and keeps only the zoom factor (plus the state of a mouse drag): the zoom sizes the box the SVG fills. Panning is native scrolling (touch, wheel, keyboard), plus a mouse drag that swallows the click it ends with. `ctrl` + wheel (a trackpad pinch) zooms around the pointer through a non-passive listener added in an effect, since React's `onWheel` is passive and could not stop the browser zooming the page; line and page deltas (Firefox) are converted to pixels, and one event zooms at most one button step. The buttons zoom around the centre. A press on the box's scrollbar is left to the browser. Without JavaScript the map is a scrollable 1:1 SVG whose links work. The wrapper breaks out of `<main>` to the full viewport width (`w-screen`); on a page that has such an element (`data-full-bleed`), `<body>` clips horizontal overflow so an always-visible page scrollbar does not add a sideways scroll. Other pages do not clip, so a wide table or code block there still scrolls. (A container query unit would avoid the clip, but making `<body>` a size container also makes it the containing block of every `position: fixed` element.)
- **JSON-LD** uses schema.org `WebSite`, `DefinedTermSet`, `DefinedTerm` and `BreadcrumbList`. Google shows no rich result for defined terms; the markup is there for semantic clarity, not traffic.
