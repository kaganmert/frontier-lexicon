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
| `aliases` | no | List of other names. Each non-empty and single line, no duplicates, none equal to `title`. |
| `prerequisites` | no | List of slugs this concept builds on, no duplicates. Each one becomes a `PREREQUISITE_OF` edge pointing to this concept. |
| `edges` | no | List of `{ type, to }`. `type` is `MEASURES`, `MITIGATES`, `CAUSES` or `RELATED_TO`; `to` is a slug. `PREREQUISITE_OF` is not allowed here: use `prerequisites` on the dependent concept. |
| `sources` | no | List of `{ title, url }`. `title` non-empty and single line; `url` an absolute `http` or `https` URL. |
| `provenance` | yes | `seed` (the hand-picked starting set), `mined` (proposed by `lexicon-mine`) or `manual` (added by hand later). |

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
   `a`). Each cycle is reported once, as `a → b → c → a`, starting from its
   alphabetically first slug.

Graph rules run only when no file has an error of its own.

Run every check from anywhere in the repository:

```sh
cargo run -p lexicon -- validate
```

It prints every problem on its own line and exits with 1, or prints
`validated <n> concepts, <e> edges` and exits with 0. CI runs it on every pull
request.

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
