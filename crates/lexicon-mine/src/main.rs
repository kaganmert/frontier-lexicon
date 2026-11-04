use anyhow::Result;
use clap::Parser;

#[derive(Parser)]
#[command(
    name = "lexicon-mine",
    version,
    about = "Collect candidate terms from external sources"
)]
struct Cli {}

fn main() -> Result<()> {
    let _cli = Cli::parse();
    println!("mine: not implemented yet");
    Ok(())
}
