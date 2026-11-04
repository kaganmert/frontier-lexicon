use anyhow::Result;
use clap::{Parser, Subcommand};

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
    Validate,
    /// Build graph.json from content files
    Build,
}

fn main() -> Result<()> {
    let cli = Cli::parse();
    match cli.command {
        Command::Validate => println!("validate: not implemented yet"),
        Command::Build => println!("build: not implemented yet"),
    }
    Ok(())
}
