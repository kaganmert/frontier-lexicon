//! Loading and graph checks as one step: what `lexicon validate` runs, and
//! what `lexicon build` is to run before writing `graph.json`.

use std::fmt;
use std::path::{Path, PathBuf};

use crate::load::io_message;
use crate::{Concept, ContentError, GraphError, LoadError, load_concepts, validate_graph};

/// Why [`validate_dir`] failed.
#[derive(Debug)]
pub enum ValidationError {
    /// The concept directory could not be listed.
    Io {
        dir: PathBuf,
        source: std::io::Error,
    },
    /// Problems in individual files; graph checks did not run.
    Content(Vec<ContentError>),
    /// Every file is fine on its own, but the graph breaks a rule.
    Graph(Vec<GraphError>),
}

impl From<LoadError> for ValidationError {
    fn from(err: LoadError) -> Self {
        match err {
            LoadError::Io { dir, source } => ValidationError::Io { dir, source },
            LoadError::Content(errors) => ValidationError::Content(errors),
        }
    }
}

impl ValidationError {
    /// One line per problem, as `<path>: [<field>: ]<message>`.
    pub fn lines(&self) -> Vec<String> {
        match self {
            ValidationError::Io { dir, source } => vec![io_message(dir, source)],
            ValidationError::Content(errors) => errors.iter().map(ToString::to_string).collect(),
            ValidationError::Graph(errors) => errors.iter().map(ToString::to_string).collect(),
        }
    }
}

impl fmt::Display for ValidationError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.lines().join("\n"))
    }
}

impl std::error::Error for ValidationError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            ValidationError::Io { source, .. } => Some(source),
            _ => None,
        }
    }
}

/// Loads every concept in `dir` and checks the graph rules.
///
/// Per-file errors are returned on their own: graph checks over a partial set
/// would only add "not a known concept" noise. On success the concepts come
/// back in the loader's canonical order.
pub fn validate_dir(dir: &Path) -> Result<Vec<Concept>, ValidationError> {
    let concepts = load_concepts(dir)?;
    let errors = validate_graph(&concepts);
    if errors.is_empty() {
        Ok(concepts)
    } else {
        Err(ValidationError::Graph(errors))
    }
}
