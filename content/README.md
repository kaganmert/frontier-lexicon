# Content

Concept texts, exercises and graph data live here.

Licensed under [CC BY-NC-SA 4.0](./LICENSE), separately from the code in the
rest of the repository (AGPL-3.0-only).

Every change here is published to https://lexicon.kaganmert.com as soon as it
lands on `main`; pull requests get a Vercel preview first.

## Concept files

One concept per file: `concepts/<slug>.mdx`, directly in `concepts/` (no
subdirectories). The slug is the file name without `.mdx` and must be lowercase
kebab-case, `^[a-z0-9]+(?:-[a-z0-9]+)*$`: letters `a`–`z`, digits and single
hyphens between them. Files whose name starts with a dot (such as `.gitkeep`)
are ignored; any other file is an error.

A file is YAML front matter followed by the MDX body. Line 1 must be exactly
`---`, and the front matter ends at the next line that is exactly `---`.
Everything after that line is the body. LF and CRLF line endings both work. A
file without front matter, with an unclosed or an empty block, is an error.

The body starts at H2 (`##`); the site renders the title as the page's only H1.

## Front matter

Unknown fields are errors, including inside `edges` and `sources` items.
"Single line" means no line breaks.

| Field | Required | Rules |
| --- | --- | --- |
| `title` | yes | Non-empty, single line. |
| `slug` | no | If present, must equal the file name. |
| `description` | yes | 1–160 characters, single line. Used as the meta description. |
| `layer` | yes | Integer 1–10. Layer 1 is model fundamentals, layer 10 research vocabulary. |
| `track` | yes | `coding`, `research` or `shared`. |
| `status` | yes | `draft` or `published`. There is no default. |
| `question` | yes | Non-empty, single line: the learning question the page answers. |
| `aliases` | no | List of other names for the same concept: no examples, narrower or broader terms, commands or vendor-specific files. Each non-empty and single line, no duplicates, none equal to `title`. |
| `prerequisites` | no | List of slugs this concept builds on, no duplicates. Each one becomes a `PREREQUISITE_OF` edge pointing to this concept. |
| `edges` | no | List of `{ type, to }`. `type` is `MEASURES`, `MITIGATES`, `CAUSES` or `RELATED_TO`; `to` is a slug. `PREREQUISITE_OF` is not allowed here: use `prerequisites` on the dependent concept. |
| `sources` | no | List of `{ title, url }`. `title` non-empty and single line; `url` an absolute `http` or `https` URL. |
| `provenance` | yes | `seed`, `mined` or `manual`; see [Provenance](#provenance). |

Optional lists may be left out, but not written as an empty key (`aliases:`
with nothing after it); use `aliases: []` or drop the line.

Text is non-empty only if it has something besides spaces. The 160-character
limit counts UTF-16 units, as the site does: most characters count once, emoji
and other characters outside the Basic Multilingual Plane count twice.

A text field that YAML would read as a number or boolean (`title: 2024`,
`question: yes`) must be quoted: `title: "2024"`. Source URLs must not contain
spaces or line breaks, and files must be saved as UTF-8 without a byte order
mark.

Whether the slugs in `prerequisites` and `edges` exist, and the graph rules
that span files, are checked separately.

`lexicon-core` (`crates/lexicon-core`) implements these rules and reports
every broken file in one run. Within a file, YAML problems (syntax, unknown or
missing fields, wrong types or values) stop at the first one; once the YAML
reads, every rule above is checked and every violation reported. The site validates only the subset it
needs to render a page (see `apps/web/README.md`).

## Graph rules

Once every file passes the rules above, the concepts are checked as a graph:

1. Every slug in `prerequisites` and in `edges[].to` names an existing concept.
2. A concept does not list itself, in `prerequisites` or as an edge target.
3. The same edge (same source, target and type) is not declared twice. Two
   edges in opposite directions, or two edges of different types between the
   same concepts, are fine.
4. A prerequisite is never in a higher layer than the concept that needs it.
   Prerequisites in the same layer are allowed.
5. Prerequisites never form a cycle (`a` needs `b`, `b` needs `c`, `c` needs
   `a`). Each group of concepts caught in cycles is reported once, with one
   cycle through it such as `a → b → c → a`, starting from the alphabetically
   first slug. Fix that one and run again: another cycle in the same group
   shows up then.

Graph rules run only when no file has an error of its own.

Run every check from anywhere in the repository:

```sh
cargo run -p lexicon --locked -- validate                    # content/concepts of this repo
cargo run -p lexicon --locked -- validate --content <dir>    # any other directory
```

Exit codes:

- `0`: everything passes; prints `validated <n> concepts, <e> edges`.
- `1`: content or graph problems, each on its own line as
  `<file>: <message>`. File problems come in file-name order and, within a
  file, in front matter order; graph problems are sorted by file.
- `2`: the directory is missing or unreadable, or, without `--content`, no
  directory holding both `Cargo.lock` and `content/concepts` was found at or
  above the current one.

Without `--content`, file paths are printed relative to the current
directory (`content/concepts/<file>` from the repository root).

CI runs it on every pull request.

## graph.json

`graph.json` is generated from `concepts/` by `lexicon build`; never edit it
by hand. It holds the ten layers, every concept (drafts included, but only
slug, title, layer, track, status and map position) and every edge, with
prerequisites expanded into `PREREQUISITE_OF` edges. It is committed so the
site's map (FLN-09) can read it without Rust at build time.

Regenerate it after any change to a concept file and commit the result:

```sh
pnpm exec turbo run graph                  # or, from anywhere in the repository:
cargo run -p lexicon --locked -- build     # validates, then writes content/graph.json
```

`build` refuses to write when validation fails, with the same output and exit
codes as `validate`. `--content <dir>` and `--out <file>` override the paths;
an output inside the concept directory is refused (exit code `2`). The file is
written to a temporary name and renamed, so an interrupted build never leaves
it half-written.

The `graph` turbo task is never cached, and no web task depends on it: the
site must build without Rust (Vercel runs only `next build`). The web tasks
list `graph.json` as an input instead, and CI keeps the committed file
current.
The output is byte-identical for the same content on every platform.

CI runs `cargo run -p lexicon --locked -- build --check`, which writes nothing
and fails a pull request whose `graph.json` is out of date: exit code `1` with
a diff from the expected file to the one on disk, `2` if the file is missing
or unreadable.

## Provenance

`provenance` records where a concept came from:

- `seed`: the term name was taken from the
  [Dictionary of AI Coding](https://github.com/mattpocock/dictionary-of-ai-coding)
  at commit `ed1ebed3975cba04ed5e74c6ca73659274beb754` (the value of
  `DICTIONARY_COMMIT` in `scripts/check-overlap.mjs`). Only the name is taken,
  as a candidate; that repository has no license, so no sentence, description,
  alias, example or arrangement of it is reused. Layers, tracks, prerequisites,
  edges, descriptions and questions here are written independently. Where a
  coined name has a generic equivalent, the concept uses the generic name and
  keeps the coined one as an alias.
- `mined`: proposed by `lexicon-mine` from external sources.
- `manual`: added by hand, not taken from the dictionary, whether in the
  initial seed or later.

The files carry nothing beyond the `provenance` value; the schema has no field
for it.

`scripts/check-overlap.mjs` compares every concept file with every Markdown
file of the dictionary at that commit (its entries, its README and
`internal/`, which holds the curriculum order) and fails on any shared run of
8 consecutive words; exit code 2 means the dictionary could not be fetched. It
checks wording only. Review these by eye against the entry of the same term:

- close paraphrase: the same points in the same order, reworded;
- aliases: none taken from an entry, including its _Avoid:_ and _Vendor
  terms:_ lines;
- arrangement: prerequisites that list the parts of the entry's definition,
  or a chain of concepts that follows the curriculum order. Layers follow
  `layerNames` in `apps/web/lib/site.ts`, so related terms share a layer; the
  prerequisites inside and between layers are this project's own.

The script needs network access, so CI does not run it; run it by hand whenever
concept text changes and paste the output in the pull request:

```sh
node scripts/check-overlap.mjs
```

## Example

````mdx
---
title: Context window
slug: context-window
description: The maximum number of tokens a model can attend to in one request, prompt and output together.
layer: 2
track: shared
status: published
question: How much text can a model take into account at once, and what happens at the limit?
aliases:
  - context length
  - context size
prerequisites:
  - token
edges:
  - type: CAUSES
    to: context-rot
  - type: RELATED_TO
    to: prompt-caching
sources:
  - title: Anthropic documentation, Context windows
    url: https://docs.claude.com/en/docs/build-with-claude/context-windows
provenance: seed
---

## What it is

The context window is the budget of tokens a model reads in one request.
Everything counts against it: the system prompt, the conversation so far,
tool results and the answer being generated.

```python
tokens_left = context_window - prompt_tokens - max_output_tokens
```

## Why it matters

When the budget runs out, the oldest material has to be dropped or
summarised, and quality usually degrades before the hard limit is reached.
````
