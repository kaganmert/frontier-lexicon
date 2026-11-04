//! Reading a directory of concept files into validated [`Concept`]s.

use std::collections::HashSet;
use std::ffi::OsString;
use std::fmt;
use std::path::{Path, PathBuf};

use serde_saphyr::{SnippetMode, render_options};
use url::Url;

use crate::concept::{Concept, FrontMatter};
use crate::{EdgeType, front_matter, is_valid_slug};

const MAX_DESCRIPTION: usize = 160;

/// Why [`load_concepts`] failed.
#[derive(Debug)]
pub enum LoadError {
    /// The directory itself could not be listed (missing or unreadable).
    Io(std::io::Error),
    /// Every problem found in every file, in file-name order.
    Content(Vec<ContentError>),
}

impl fmt::Display for LoadError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            LoadError::Io(err) => write!(f, "cannot list the concept directory: {err}"),
            LoadError::Content(errors) => {
                let mut lines = errors.iter();
                if let Some(first) = lines.next() {
                    write!(f, "{first}")?;
                }
                for error in lines {
                    write!(f, "\n{error}")?;
                }
                Ok(())
            }
        }
    }
}

impl std::error::Error for LoadError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            LoadError::Io(err) => Some(err),
            LoadError::Content(_) => None,
        }
    }
}

/// One problem in one concept file.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ContentError {
    pub path: PathBuf,
    /// The front matter field at fault, such as `title` or `edges[1].to`;
    /// `None` when the problem concerns the file as a whole.
    pub field: Option<String>,
    pub message: String,
}

impl fmt::Display for ContentError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match &self.field {
            Some(field) => write!(f, "{}: {field}: {}", self.path.display(), self.message),
            None => write!(f, "{}: {}", self.path.display(), self.message),
        }
    }
}

impl std::error::Error for ContentError {}

/// Loads and validates every concept file in `dir`.
///
/// `dir` must contain only `<slug>.mdx` files; dotfiles are ignored. Files are
/// read in file-name order and every problem in every file is reported in one
/// [`LoadError::Content`]. Whether referenced slugs exist is not checked here.
///
/// The result is in canonical order: layer, then track (`shared`, `coding`,
/// `research`), then slug by byte order.
///
/// ```
/// use std::path::Path;
/// use lexicon_core::{Track, load_concepts};
///
/// let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/valid-full");
/// let concepts = load_concepts(&dir)?;
/// assert_eq!(concepts[0].slug, "context-window");
/// assert_eq!(concepts[0].track, Track::Shared);
/// # Ok::<(), lexicon_core::LoadError>(())
/// ```
pub fn load_concepts(dir: &Path) -> Result<Vec<Concept>, LoadError> {
    let mut entries = Vec::new();
    for entry in std::fs::read_dir(dir).map_err(LoadError::Io)? {
        let entry = entry.map_err(LoadError::Io)?;
        let name = entry.file_name();
        if !name.as_encoded_bytes().starts_with(b".") {
            entries.push(name);
        }
    }
    entries.sort();

    let mut concepts = Vec::new();
    let mut errors = Vec::new();
    for name in entries {
        match load_file(dir, name) {
            Ok(concept) => concepts.push(concept),
            Err(mut file_errors) => errors.append(&mut file_errors),
        }
    }
    if !errors.is_empty() {
        return Err(LoadError::Content(errors));
    }
    concepts.sort_by(|a, b| {
        (a.layer, a.track.rank(), a.slug.as_bytes()).cmp(&(
            b.layer,
            b.track.rank(),
            b.slug.as_bytes(),
        ))
    });
    Ok(concepts)
}

/// Collects the problems of one file.
struct Problems {
    path: PathBuf,
    errors: Vec<ContentError>,
}

impl Problems {
    fn file(&mut self, message: impl Into<String>) {
        self.push(None, message.into());
    }

    fn field(&mut self, field: impl Into<String>, message: impl Into<String>) {
        self.push(Some(field.into()), message.into());
    }

    fn push(&mut self, field: Option<String>, message: String) {
        self.errors.push(ContentError {
            path: self.path.clone(),
            field,
            message,
        });
    }

    /// Non-empty and free of line breaks.
    fn single_line(&mut self, field: impl Into<String>, value: &str) {
        if value.is_empty() {
            self.field(field, "must not be empty");
        } else if value.contains(['\r', '\n']) {
            self.field(field, "must be a single line");
        }
    }

    fn slug(&mut self, field: impl Into<String>, value: &str) {
        if !is_valid_slug(value) {
            self.field(
                field,
                format!("\"{value}\" is not a lowercase kebab-case slug"),
            );
        }
    }
}

fn load_file(dir: &Path, name: OsString) -> Result<Concept, Vec<ContentError>> {
    let path = dir.join(&name);
    let mut problems = Problems {
        path: path.clone(),
        errors: Vec::new(),
    };

    if path.is_dir() {
        problems.file(
            "subdirectories are not allowed; concept files sit directly in the concept directory",
        );
        return Err(problems.errors);
    }
    let name = name.to_string_lossy();
    let Some(slug) = name.strip_suffix(".mdx") else {
        problems.file("only <slug>.mdx files are allowed in the concept directory");
        return Err(problems.errors);
    };
    if !is_valid_slug(slug) {
        problems.file(format!(
            "file name must be <slug>.mdx with a lowercase kebab-case slug (got \"{slug}\")"
        ));
    }

    let text = match std::fs::read(&path).map(String::from_utf8) {
        Ok(Ok(text)) => text,
        Ok(Err(_)) => {
            problems.file("file is not valid UTF-8");
            return Err(problems.errors);
        }
        Err(err) => {
            problems.file(format!("cannot read file: {err}"));
            return Err(problems.errors);
        }
    };
    let split = match front_matter::split(&text) {
        Ok(split) => split,
        Err(message) => {
            problems.file(message);
            return Err(problems.errors);
        }
    };
    let fm: FrontMatter = match serde_saphyr::from_str(split.yaml) {
        Ok(fm) => fm,
        Err(err) => {
            // The YAML starts on line 2 of the file, after the opening `---`.
            problems.file(err.render_with_options(render_options! {
                snippets: SnippetMode::Off,
                line_offset: 1,
            }));
            return Err(problems.errors);
        }
    };

    check(&mut problems, &fm, slug);
    if !problems.errors.is_empty() {
        return Err(problems.errors);
    }
    Ok(Concept {
        path,
        slug: slug.to_owned(),
        title: fm.title,
        description: fm.description,
        layer: fm.layer,
        track: fm.track,
        status: fm.status,
        question: fm.question,
        aliases: fm.aliases,
        prerequisites: fm.prerequisites,
        edges: fm.edges,
        sources: fm.sources,
        provenance: fm.provenance,
        body: split.body.to_owned(),
    })
}

/// The rules serde cannot express, in front matter field order.
fn check(p: &mut Problems, fm: &FrontMatter, file_slug: &str) {
    p.single_line("title", &fm.title);
    if let Some(slug) = &fm.slug
        && slug != file_slug
    {
        p.field(
            "slug",
            format!("\"{slug}\" does not match the file name \"{file_slug}\""),
        );
    }
    p.single_line("description", &fm.description);
    let length = fm.description.chars().count();
    if length > MAX_DESCRIPTION {
        p.field(
            "description",
            format!("must be at most {MAX_DESCRIPTION} characters (got {length})"),
        );
    }
    if !(1..=10).contains(&fm.layer) {
        p.field(
            "layer",
            format!("must be between 1 and 10 (got {})", fm.layer),
        );
    }
    p.single_line("question", &fm.question);

    let mut seen = HashSet::new();
    for (i, alias) in fm.aliases.iter().enumerate() {
        let field = format!("aliases[{i}]");
        p.single_line(&field, alias);
        if *alias == fm.title {
            p.field(&field, "must not repeat the title");
        }
        if !alias.is_empty() && !seen.insert(alias) {
            p.field(&field, format!("\"{alias}\" is listed twice"));
        }
    }

    let mut seen = HashSet::new();
    for (i, slug) in fm.prerequisites.iter().enumerate() {
        let field = format!("prerequisites[{i}]");
        p.slug(&field, slug);
        if !seen.insert(slug) {
            p.field(&field, format!("\"{slug}\" is listed twice"));
        }
    }

    for (i, edge) in fm.edges.iter().enumerate() {
        if edge.kind == EdgeType::PrerequisiteOf {
            p.field(
                format!("edges[{i}].type"),
                "PREREQUISITE_OF is not allowed here; list the concept under `prerequisites` of the dependent concept instead",
            );
        }
        p.slug(format!("edges[{i}].to"), &edge.to);
    }

    for (i, source) in fm.sources.iter().enumerate() {
        p.single_line(format!("sources[{i}].title"), &source.title);
        if let Err(message) = check_url(&source.url) {
            p.field(format!("sources[{i}].url"), message);
        }
    }
}

fn check_url(raw: &str) -> Result<(), String> {
    match Url::parse(raw) {
        Ok(url) if matches!(url.scheme(), "http" | "https") => Ok(()),
        Ok(url) => Err(format!(
            "\"{raw}\" must use http or https (got {})",
            url.scheme()
        )),
        Err(err) => Err(format!("\"{raw}\" is not an absolute URL: {err}")),
    }
}
