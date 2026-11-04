//! Concept graph model for frontier-lexicon.
//!
//! The content files under `content/` are the source of truth. This crate
//! loads them, validates the schema and enforces the two graph invariants:
//! no `PREREQUISITE_OF` edge points backwards across layers, and the
//! prerequisite subgraph has no cycles.

use serde::{Deserialize, Serialize};

/// Which audience a concept belongs to.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Track {
    Coding,
    Research,
    Shared,
}

/// Typed, directional relation between two concepts.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum EdgeType {
    PrerequisiteOf,
    Measures,
    Mitigates,
    Causes,
    RelatedTo,
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
    fn track_serialises_lowercase() {
        let json = serde_json::to_string(&Track::Shared).unwrap();
        assert_eq!(json, "\"shared\"");
    }
}
