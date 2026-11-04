//! The concept schema: what a concept file's front matter must contain.

use std::path::PathBuf;

use serde::{Deserialize, Serialize};

use crate::{EdgeType, Track};

/// A concept loaded from `content/concepts/<slug>.mdx`, front matter validated.
///
/// Fields are public and the struct is exhaustive, so graph checks can build
/// values in memory without going through files.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Concept {
    /// The file the concept was loaded from: the loader's directory joined
    /// with the file name.
    pub path: PathBuf,
    /// Always the file stem; a `slug` in the front matter must equal it.
    pub slug: String,
    pub title: String,
    /// At most 160 UTF-16 code units, as the site counts; used as the meta
    /// description.
    pub description: String,
    /// 1–10.
    pub layer: u8,
    pub track: Track,
    pub status: Status,
    /// The learning question the page answers.
    pub question: String,
    pub aliases: Vec<String>,
    /// Slugs of concepts this one builds on: sugar for `PREREQUISITE_OF`
    /// edges pointing to this concept.
    pub prerequisites: Vec<String>,
    /// Typed edges from this concept; never `PREREQUISITE_OF`.
    pub edges: Vec<Edge>,
    pub sources: Vec<Source>,
    pub provenance: Provenance,
    /// Everything after the closing `---` line, untrimmed and unparsed.
    pub body: String,
}

impl Concept {
    /// Edges this concept declares: one `PREREQUISITE_OF` per prerequisite
    /// (pointing to this concept) plus every entry in `edges`.
    pub fn edge_count(&self) -> usize {
        self.prerequisites.len() + self.edges.len()
    }
}

/// Whether a concept is ready to be published.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Status {
    Draft,
    Published,
}

/// Where a concept came from.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Provenance {
    /// Part of the hand-picked starting set.
    Seed,
    /// Proposed by `lexicon-mine` from external sources.
    Mined,
    /// Added by hand later.
    Manual,
}

/// A typed edge from the concept that declares it to `to`.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Edge {
    #[serde(rename = "type")]
    pub kind: EdgeType,
    /// Slug of the target concept.
    pub to: String,
}

/// A reference backing the concept.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Source {
    pub title: String,
    /// An absolute `http` or `https` URL.
    pub url: String,
}

/// The front matter exactly as written; [`crate::load_concepts`] checks the
/// rules serde cannot express and turns it into a [`Concept`].
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct FrontMatter {
    pub title: String,
    pub slug: Option<String>,
    pub description: String,
    pub layer: u8,
    pub track: Track,
    pub status: Status,
    pub question: String,
    #[serde(default)]
    pub aliases: Vec<String>,
    #[serde(default)]
    pub prerequisites: Vec<String>,
    #[serde(default)]
    pub edges: Vec<Edge>,
    #[serde(default)]
    pub sources: Vec<Source>,
    pub provenance: Provenance,
}
