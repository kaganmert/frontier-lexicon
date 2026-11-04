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
                    let edges: usize = concepts
                        .iter()
                        .map(|c| c.prerequisites.len() + c.edges.len())
                        .sum();
                    println!("validated {} concepts, {edges} edges", concepts.len());
                }
                Err(err) => fail(&dir, &err),
            }
        }
        Command::Build => println!("build: not implemented yet"),
    }
    Ok(())
}

/// Prints every problem to stderr, sorted, one per line, and exits with the
/// matching code.
fn fail(dir: &Path, err: &ValidationError) -> ! {
    if let ValidationError::Io(io) = err {
        eprintln!("cannot read concept directory {}: {io}", dir.display());
        exit(EXIT_IO);
    }
    let mut lines = err.lines();
    lines.sort();
    for line in lines {
        eprintln!("{line}");
    }
    exit(EXIT_INVALID);
}

/// `content/concepts` under the nearest ancestor of the current directory
/// that holds `Cargo.lock`, so the command works from anywhere in the repo.
fn default_content_dir() -> PathBuf {
    let cwd = std::env::current_dir().unwrap_or_else(|err| {
        eprintln!("cannot read the current directory: {err}");
        exit(EXIT_IO);
    });
    match cwd.ancestors().find(|dir| dir.join("Cargo.lock").is_file()) {
        Some(root) => root.join("content/concepts"),
        None => {
            eprintln!(
                "no Cargo.lock in {} or any parent; run inside the repository or pass --content <dir>",
                cwd.display()
            );
            exit(EXIT_IO);
        }
    }
}
