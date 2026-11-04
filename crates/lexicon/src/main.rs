use std::path::{Path, PathBuf};
use std::process::exit;

use anyhow::Result;
use clap::{Parser, Subcommand};
use lexicon_core::{ValidationError, validate_dir};

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
    /// Build graph.json from content files
    Build,
}

/// Exit code for content or graph errors.
const EXIT_INVALID: i32 = 1;
/// Exit code when the concept directory cannot be found or read. Clap also
/// exits 2, for usage errors.
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
        Command::Build => println!("build: not implemented yet"),
    }
    Ok(())
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
