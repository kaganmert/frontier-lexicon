//! Documents and code outside this crate that must agree with it.

use std::path::{Path, PathBuf};

fn repo_file(path: &str) -> String {
    let full: PathBuf = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../..")
        .join(path);
    std::fs::read_to_string(&full).unwrap_or_else(|e| panic!("{}: {e}", full.display()))
}

/// The text between the first `start` and the next `end` after it.
fn between<'a>(text: &'a str, start: &str, end: &str) -> &'a str {
    let from = text.find(start).unwrap_or_else(|| panic!("no {start:?}")) + start.len();
    let len = text[from..]
        .find(end)
        .unwrap_or_else(|| panic!("no {end:?}"));
    &text[from..from + len]
}

#[test]
fn content_readme_example_is_the_full_fixture() {
    let readme = repo_file("content/README.md");
    // Trailing newline included: the fence closes on the line after it.
    let example = format!("{}\n", between(&readme, "\n````mdx\n", "\n````\n"));
    let fixture = repo_file("crates/lexicon-core/tests/fixtures/valid-full/context-window.mdx");
    assert_eq!(example, fixture);
}

#[test]
fn slug_pattern_matches_the_web_side() {
    let web = repo_file("apps/web/lib/concept-model.ts");
    let web_pattern = between(&web, "export const slugPattern = /", "/;");
    let rust = repo_file("crates/lexicon-core/src/slug.rs");
    let rust_pattern = between(&rust, "Equivalent to the pattern `", "`");
    assert_eq!(rust_pattern, web_pattern);
}
