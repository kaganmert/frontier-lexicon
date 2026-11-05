use std::io::ErrorKind;
use std::path::{Component, Path, PathBuf};
use std::process::exit;

use anyhow::Result;
use clap::{Parser, Subcommand};
use lexicon_core::{ValidationError, graph_json, validate_dir};
use similar::TextDiff;

#[derive(Parser)]
#[command(
    name = "lexicon",
    version,
    about = "frontier-lexicon content and graph tooling"
)]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// Validate content files and graph invariants
    Validate {
        /// Concept directory [default: content/concepts in the repo root, the
        /// nearest ancestor of the current directory holding Cargo.lock]
        #[arg(long, value_name = "DIR")]
        content: Option<PathBuf>,
    },
    /// Validate, then write graph.json (concepts, edges and map layout)
    Build {
        /// Concept directory [default: as for `validate`]
        #[arg(long, value_name = "DIR")]
        content: Option<PathBuf>,
        /// Output file [default: graph.json in the parent of the concept
        /// directory, so content/graph.json]
        #[arg(long, value_name = "FILE")]
        out: Option<PathBuf>,
        /// Write nothing; exit 1 with a diff if the file is out of date, 2 if
        /// it is missing or unreadable
        #[arg(long)]
        check: bool,
    },
}

/// Exit code for content or graph errors, and for a stale `graph.json`.
const EXIT_INVALID: i32 = 1;
/// Exit code when the concept directory cannot be found or read, or
/// `graph.json` cannot be read or written. Clap also exits 2, for usage errors.
const EXIT_IO: i32 = 2;

fn main() -> Result<()> {
    let cli = Cli::parse();
    match cli.command {
        Command::Validate { content } => {
            let dir = content.unwrap_or_else(default_content_dir);
            match validate_dir(&dir) {
                Ok(concepts) => {
                    let edges: usize = concepts.iter().map(|c| c.edge_count()).sum();
                    println!("validated {} concepts, {edges} edges", concepts.len());
                }
                Err(err) => fail(&err),
            }
        }
        Command::Build {
            content,
            out,
            check,
        } => {
            let dir = content.unwrap_or_else(default_content_dir);
            let concepts = validate_dir(&dir).unwrap_or_else(|err| fail(&err));
            let out = out.unwrap_or_else(|| default_out(&dir));
            refuse_inside(&out, &dir);
            let json = graph_json(&concepts);
            if check {
                check_graph(&out, &json);
            } else {
                write_graph(&out, &json);
            }
        }
    }
    Ok(())
}

/// `graph.json` next to the concept directory: `content/graph.json` for
/// `content/concepts`. When the path does not end in a directory name (`.`,
/// `..`, `/`), its lexical parent is not the real one, so the directory is
/// resolved first; it exists, since validation just read it.
fn default_out(content: &Path) -> PathBuf {
    let parent = match content.components().next_back() {
        Some(Component::Normal(_)) => content.parent().map(Path::to_path_buf),
        _ => std::fs::canonicalize(content)
            .ok()
            .and_then(|dir| dir.parent().map(Path::to_path_buf)),
    };
    parent.unwrap_or_default().join("graph.json")
}

/// Exits 2 if `out` would land in the concept directory, where any file but
/// `<slug>.mdx` fails the next validation.
fn refuse_inside(out: &Path, content: &Path) {
    let parent = match out.parent() {
        Some(parent) if !parent.as_os_str().is_empty() => parent,
        _ => Path::new("."),
    };
    let (Ok(parent), Ok(content)) = (
        std::fs::canonicalize(parent),
        std::fs::canonicalize(content),
    ) else {
        return; // a missing output directory fails on write instead
    };
    if parent.starts_with(&content) {
        eprintln!(
            "{}: inside the concept directory {}; pass --out with a path outside it",
            out.display(),
            content.display()
        );
        exit(EXIT_IO);
    }
}

/// Writes a sibling temp file and renames it over `out`, so an interrupted
/// build never leaves a truncated `graph.json`.
fn write_graph(out: &Path, json: &str) {
    let name = out.file_name().unwrap_or(out.as_os_str()).to_string_lossy();
    let tmp = out.with_file_name(format!(".{name}.tmp"));
    if let Err(err) = std::fs::write(&tmp, json).and_then(|()| std::fs::rename(&tmp, out)) {
        let _ = std::fs::remove_file(&tmp);
        eprintln!("{}: cannot write: {err}", out.display());
        exit(EXIT_IO);
    }
    println!("wrote {}", out.display());
}

/// Compares `out` with `expected` byte for byte; on a difference prints a
/// unified diff (expected → on disk) to stderr and exits 1. A missing or
/// unreadable file exits 2.
fn check_graph(out: &Path, expected: &str) {
    let on_disk = match std::fs::read(out) {
        Ok(bytes) => bytes,
        Err(err) => {
            if err.kind() == ErrorKind::NotFound {
                eprintln!(
                    "{}: missing; run `lexicon build` to create it",
                    out.display()
                );
            } else {
                eprintln!("{}: cannot read: {err}", out.display());
            }
            exit(EXIT_IO);
        }
    };
    if on_disk == expected.as_bytes() {
        println!("{} is up to date", out.display());
        return;
    }
    let on_disk = String::from_utf8_lossy(&on_disk);
    let label = out.display();
    eprint!(
        "{}",
        TextDiff::from_lines(expected, &on_disk)
            .unified_diff()
            .header(
                &format!("{label} (expected)"),
                &format!("{label} (on disk)")
            )
    );
    if on_disk.replace("\r\n", "\n") == expected {
        eprintln!("{label}: differs only in line endings; graph.json uses LF, not CRLF");
    }
    eprintln!("{label}: out of date; run `lexicon build` to regenerate it");
    exit(EXIT_INVALID);
}

/// Prints every problem to stderr, one per line, and exits with the matching
/// code. Content errors keep the loader's order (file name, then field order);
/// graph errors are sorted so each file's problems sit together.
fn fail(err: &ValidationError) -> ! {
    let mut lines = err.lines();
    if let ValidationError::Graph(_) = err {
        lines.sort();
    }
    for line in lines {
        eprintln!("{line}");
    }
    exit(match err {
        ValidationError::Io { .. } => EXIT_IO,
        _ => EXIT_INVALID,
    });
}

/// `content/concepts` of the repository the current directory is in: the
/// nearest ancestor holding both `Cargo.lock` and `content/concepts` (a
/// nested crate's own `Cargo.lock` is skipped). Returned relative to the
/// current directory, so error lines read `content/concepts/<file>: …` from
/// the repo root.
fn default_content_dir() -> PathBuf {
    let cwd = std::env::current_dir().unwrap_or_else(|err| {
        eprintln!("cannot read the current directory: {err}");
        exit(EXIT_IO);
    });
    let content = Path::new("content/concepts");
    let Some(root) = cwd
        .ancestors()
        .find(|dir| dir.join("Cargo.lock").is_file() && dir.join(content).is_dir())
    else {
        eprintln!(
            "no directory holding Cargo.lock and content/concepts in {} or above; run inside the repository or pass --content <dir>",
            cwd.display()
        );
        exit(EXIT_IO);
    };
    let depth = cwd
        .strip_prefix(root)
        .map_or(0, |below| below.components().count());
    let mut dir: PathBuf = std::iter::repeat_n("..", depth).collect();
    dir.push(content);
    dir
}
