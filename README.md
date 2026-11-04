# frontier-lexicon

[![CI](https://github.com/kaganmert/frontier-lexicon/actions/workflows/ci.yml/badge.svg)](https://github.com/kaganmert/frontier-lexicon/actions/workflows/ci.yml)

Live at **https://lexicon.kaganmert.com**.

An interactive, layered map of modern AI concepts, from tokens to alignment research.
Click a node for the theory, a hands-on exercise, and the concepts you need first.

## Structure

- Concepts are nodes in a layered directed acyclic graph. A `PREREQUISITE_OF`
  edge always points from a lower layer to a higher one, so the graph doubles as
  a learning path.
- Other edge types (`MEASURES`, `MITIGATES`, `CAUSES`, `RELATED_TO`) carry the
  concept map itself and are free in direction.
- Every concept cites its sources.

## CI

Every pull request and every push to `main` runs the `CI` workflow
(`.github/workflows/ci.yml`). Its two jobs, `web` and `rust`, are required
status checks on `main`: a red job blocks the merge. Pull requests also get a
Vercel preview deployment with its own status check; it is informative, not
required.

Reproduce locally from the repo root:

```sh
pnpm install --frozen-lockfile
pnpm exec turbo run check lint test build format:check --filter=web --filter=//
cargo fmt --all --check
cargo lint   # alias for clippy, see .cargo/config.toml
cargo test --workspace --locked
```

Concept files under `content/` are not Prettier-checked; their shape is owned
by the content schema and `lexicon validate`.

The Rust toolchain is pinned in `rust-toolchain.toml` (rustup picks it up
locally and in CI). Bump it in its own PR so a new clippy lint never lands in
the middle of unrelated work.

## Licensing

This repository uses two licenses:

- **Code** (everything outside `content/`): [GNU AGPL-3.0-only](./LICENSE).
  You may use, modify and redistribute it, including as a network service,
  as long as your version stays under the same license.
- **Content** (everything inside `content/`: concept texts, exercises, graph
  data): [CC BY-NC-SA 4.0](./content/LICENSE). Attribution required,
  no commercial use, share under the same license.

Copyright © 2026 Kağan Mert.
