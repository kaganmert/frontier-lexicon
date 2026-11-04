use std::path::{Path, PathBuf};

use assert_cmd::Command;

fn fixture(case: &str) -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("tests/fixtures")
        .join(case)
}

struct Run {
    code: Option<i32>,
    stdout: String,
    stderr_lines: Vec<String>,
}

fn validate(args: &[&str], cwd: Option<&Path>) -> Run {
    let mut cmd = Command::cargo_bin("lexicon").unwrap();
    cmd.arg("validate").args(args);
    if let Some(cwd) = cwd {
        cmd.current_dir(cwd);
    }
    let output = cmd.output().unwrap();
    Run {
        code: output.status.code(),
        stdout: String::from_utf8(output.stdout).unwrap(),
        stderr_lines: String::from_utf8(output.stderr)
            .unwrap()
            .lines()
            .map(str::to_owned)
            .collect(),
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
    let root = std::env::temp_dir().join(format!("lexicon-validate-{}", std::process::id()));
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
    std::fs::remove_dir_all(&root).unwrap();
    assert_eq!(run.code, Some(0), "{:?}", run.stderr_lines);
    assert_eq!(run.stdout, "validated 1 concepts, 0 edges\n");
}

#[test]
fn without_a_cargo_lock_above_it_exits_2() {
    let dir = std::env::temp_dir().join(format!("lexicon-no-lock-{}", std::process::id()));
    std::fs::create_dir_all(&dir).unwrap();
    let run = validate(&[], Some(&dir));
    std::fs::remove_dir_all(&dir).unwrap();
    assert_eq!(run.code, Some(2));
    assert!(
        run.stderr_lines[0].contains("Cargo.lock"),
        "{:?}",
        run.stderr_lines
    );
}
