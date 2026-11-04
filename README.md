# frontier-lexicon

An interactive, layered map of modern AI concepts, from tokens to alignment research.
Click a node for the theory, a hands-on exercise, and the concepts you need first.

## Structure

- Concepts are nodes in a layered directed acyclic graph. A `PREREQUISITE_OF`
  edge always points from a lower layer to a higher one, so the graph doubles as
  a learning path.
- Other edge types (`MEASURES`, `MITIGATES`, `CAUSES`, `RELATED_TO`) carry the
  concept map itself and are free in direction.
- Every concept cites its sources.

## Licensing

This repository uses two licenses:

- **Code** (everything outside `content/`): [GNU AGPL-3.0-only](./LICENSE).
  You may use, modify and redistribute it, including as a network service,
  as long as your version stays under the same license.
- **Content** (everything inside `content/`: concept texts, exercises, graph
  data): [CC BY-NC-SA 4.0](./content/LICENSE). Attribution required,
  no commercial use, share under the same license.

Copyright © 2026 Kağan Mert.
