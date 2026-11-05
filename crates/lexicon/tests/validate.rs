mod common;

use std::path::Path;

use common::{TempDir, fixture, lexicon};

struct Run {
    code: Option<i32>,
    stdout: String,
    stderr_lines: Vec<String>,
}

fn validate(args: &[&str], cwd: Option<&Path>) -> Run {
    let mut full = vec!["validate"];
    full.extend_from_slice(args);
    let run = lexicon(&full, cwd);
    Run {
        stderr_lines: run.stderr_lines(),
        code: run.code,
        stdout: run.stdout,
    }
}

fn validate_fixture(case: &str) -> Run {
    validate(&["--content", fixture(case).to_str().unwrap()], None)
}

#[test]
fn an_empty_directory_is_valid() {
    let run = validate_fixture("empty");
    assert_eq!(run.code, Some(0), "{:?}", run.stderr_lines);
    assert_eq!(run.stdout, "validated 0 concepts, 0 edges\n");
}

#[test]
fn counts_expanded_prerequisites_and_edges() {
    let run = validate_fixture("valid");
    assert_eq!(run.code, Some(0), "{:?}", run.stderr_lines);
    assert_eq!(run.stdout, "validated 3 concepts, 4 edges\n");
}

#[test]
fn graph_errors_exit_1_with_one_line_each() {
    let run = validate_fixture("graph-errors");
    assert_eq!(run.code, Some(1));
    assert_eq!(run.stdout, "");
    assert_eq!(run.stderr_lines.len(), 3, "{:#?}", run.stderr_lines);
    let has = |words: &[&str]| {
        run.stderr_lines
            .iter()
            .any(|line| words.iter().all(|w| line.contains(w)))
    };
    assert!(has(&["context-window.mdx", "context-rot"]), "dangling");
    assert!(
        has(&["embedding", "kv-cache", "layer 1", "layer 3"]),
        "backward"
    );
    assert!(
        has(&["agent-loop", "tool-use", "planning", "cycle"]),
        "cycle"
    );
}

#[test]
fn errors_are_sorted() {
    let run = validate_fixture("graph-errors");
    let mut sorted = run.stderr_lines.clone();
    sorted.sort();
    assert_eq!(run.stderr_lines, sorted);
}

#[test]
fn content_errors_keep_the_loader_order() {
    let run = validate_fixture("content-order");
    assert_eq!(run.code, Some(1));
    let fields: Vec<_> = run
        .stderr_lines
        .iter()
        .map(|line| line.split(": ").nth(1).unwrap())
        .collect();
    assert_eq!(
        fields,
        ["title", "description", "aliases[2]", "aliases[10]"]
    );
}

#[test]
fn schema_errors_suppress_graph_checks() {
    let run = validate_fixture("schema-error");
    assert_eq!(run.code, Some(1));
    assert_eq!(run.stderr_lines.len(), 1, "{:#?}", run.stderr_lines);
    assert!(run.stderr_lines[0].contains("token.mdx: layer:"));
}

#[test]
fn a_missing_directory_exits_2() {
    let run = validate_fixture("does-not-exist");
    assert_eq!(run.code, Some(2));
    assert!(
        run.stderr_lines[0].contains("does-not-exist"),
        "{:?}",
        run.stderr_lines
    );
}

#[test]
fn finds_content_from_any_directory_below_the_cargo_lock() {
    let tmp = TempDir::new("lexicon-validate");
    let root = &tmp.0;
    let nested = root.join("crates/lexicon/src");
    std::fs::create_dir_all(&nested).unwrap();
    std::fs::create_dir_all(root.join("content/concepts")).unwrap();
    std::fs::write(root.join("Cargo.lock"), "").unwrap();
    std::fs::copy(
        fixture("valid").join("token.mdx"),
        root.join("content/concepts/token.mdx"),
    )
    .unwrap();

    let run = validate(&[], Some(&nested));
    assert_eq!(run.code, Some(0), "{:?}", run.stderr_lines);
    assert_eq!(run.stdout, "validated 1 concepts, 0 edges\n");
}

#[test]
fn default_paths_are_relative_to_the_current_directory() {
    let tmp = TempDir::new("lexicon-relative");
    let root = &tmp.0;
    std::fs::create_dir_all(root.join("content/concepts")).unwrap();
    std::fs::create_dir_all(root.join("apps/web")).unwrap();
    std::fs::write(root.join("Cargo.lock"), "").unwrap();
    std::fs::copy(
        fixture("schema-error").join("token.mdx"),
        root.join("content/concepts/token.mdx"),
    )
    .unwrap();

    let from_root = validate(&[], Some(root));
    assert_eq!(
        from_root.stderr_lines,
        ["content/concepts/token.mdx: layer: must be between 1 and 10 (got 0)"]
    );
    let from_below = validate(&[], Some(&root.join("apps/web")));
    assert!(
        from_below.stderr_lines[0].starts_with("../../content/concepts/token.mdx: "),
        "{:?}",
        from_below.stderr_lines
    );
}

#[test]
fn skips_a_cargo_lock_without_content() {
    // A nested crate (vendored, packaged, an addon) has its own Cargo.lock
    // but no content/concepts; the repo root above it is the one meant.
    let tmp = TempDir::new("lexicon-nested-lock");
    let root = &tmp.0;
    let vendored = root.join("node_modules/addon");
    std::fs::create_dir_all(&vendored).unwrap();
    std::fs::write(vendored.join("Cargo.lock"), "").unwrap();
    std::fs::create_dir_all(root.join("content/concepts")).unwrap();
    std::fs::write(root.join("Cargo.lock"), "").unwrap();

    let run = validate(&[], Some(&vendored));
    assert_eq!(run.code, Some(0), "{:?}", run.stderr_lines);
}

#[test]
fn without_a_cargo_lock_above_it_exits_2() {
    let tmp = TempDir::new("lexicon-no-lock");
    let repo_above = tmp
        .0
        .ancestors()
        .any(|dir| dir.join("Cargo.lock").is_file() && dir.join("content/concepts").is_dir());
    if repo_above {
        eprintln!("skipped: the temp directory sits inside a lexicon checkout");
        return;
    }
    let run = validate(&[], Some(&tmp.0));
    assert_eq!(run.code, Some(2));
    assert!(
        run.stderr_lines[0].contains("Cargo.lock"),
        "{:?}",
        run.stderr_lines
    );
}
