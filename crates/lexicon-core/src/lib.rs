//! Concept graph model for frontier-lexicon.
//!
//! The content files under `content/` are the source of truth. This crate
//! loads them, validates the schema and enforces the two graph invariants:
//! no `PREREQUISITE_OF` edge points backwards across layers, and the
//! prerequisite subgraph has no cycles.
//!
//! The front matter contract itself is documented for authors in
//! `content/README.md`; [`load_concepts`] is its only implementation.
//!
//! # Dependency choices
//!
//! - YAML is parsed with [`serde-saphyr`](https://crates.io/crates/serde-saphyr):
//!   pure Rust, `unsafe` denied in its own code and actively maintained.
//!   `serde_yaml` is archived, and its `serde_yaml_ng` / `serde_norway` forks
//!   still sit on `unsafe-libyaml`. It rejects an unquoted empty value, `~` or
//!   `null` for a string field but accepts a quoted `""`, so every non-empty
//!   rule is checked after deserialisation.
//! - Source URLs are parsed with [`url`](https://crates.io/crates/url), the
//!   WHATWG URL implementation.
//! - No regex crate: the one pattern the schema needs (the slug) is a
//!   hand-rolled predicate, [`is_valid_slug`].

mod concept;
mod front_matter;
mod graph;
mod load;
mod slug;
mod validate;

use serde::{Deserialize, Serialize};

pub use concept::{Concept, Edge, Provenance, Source, Status};
pub use graph::{GraphError, validate_graph};
pub use load::{ContentError, LoadError, load_concepts};
pub use slug::is_valid_slug;
pub use validate::{ValidationError, validate_dir};

/// Which audience a concept belongs to.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Track {
    Coding,
    Research,
    Shared,
}

impl Track {
    /// Display order of the tracks: `shared`, `coding`, `research`, the same
    /// as `tracks` in `apps/web/lib/site.ts` (a contract test keeps them in
    /// step). Spelled out here rather than derived from the declaration order,
    /// so reordering the variants cannot silently change the order of
    /// [`crate::load_concepts`].
    pub fn rank(self) -> u8 {
        match self {
            Track::Shared => 0,
            Track::Coding => 1,
            Track::Research => 2,
        }
    }
}

/// Typed, directional relation between two concepts.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum EdgeType {
    PrerequisiteOf,
    Measures,
    Mitigates,
    Causes,
    RelatedTo,
}

impl EdgeType {
    /// The name used in front matter and `graph.json`, such as `RELATED_TO`.
    pub fn as_str(self) -> &'static str {
        match self {
            EdgeType::PrerequisiteOf => "PREREQUISITE_OF",
            EdgeType::Measures => "MEASURES",
            EdgeType::Mitigates => "MITIGATES",
            EdgeType::Causes => "CAUSES",
            EdgeType::RelatedTo => "RELATED_TO",
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn edge_type_serialises_as_screaming_snake_case() {
        let json = serde_json::to_string(&EdgeType::PrerequisiteOf).unwrap();
        assert_eq!(json, "\"PREREQUISITE_OF\"");
    }

    #[test]
    fn edge_type_name_matches_serde() {
        for kind in [
            EdgeType::PrerequisiteOf,
            EdgeType::Measures,
            EdgeType::Mitigates,
            EdgeType::Causes,
            EdgeType::RelatedTo,
        ] {
            assert_eq!(serde_json::to_value(kind).unwrap(), kind.as_str());
        }
    }

    #[test]
    fn track_serialises_lowercase() {
        let json = serde_json::to_string(&Track::Shared).unwrap();
        assert_eq!(json, "\"shared\"");
    }
}
