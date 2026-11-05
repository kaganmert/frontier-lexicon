mod common;

use std::fs;

use common::{TempDir, fixture, lexicon};

/// `lexicon build --content <fixture> --out <out> [extra]`.
fn build(case: &str, out: &std::path::Path, extra: &[&str]) -> common::Run {
    let content = fixture(case);
    let mut args = vec![
        "--content",
        content.to_str().unwrap(),
        "--out",
        out.to_str().unwrap(),
    ];
    args.extend_from_slice(extra);
    lexicon("build", &args, None)
}

/// A fresh `graph.json` of the layout fixture in its own temp directory.
fn fresh_graph(name: &str) -> (TempDir, std::path::PathBuf) {
    let tmp = TempDir::new(name);
    let out = tmp.path("graph.json");
    let run = build("layout", &out, &[]);
    assert_eq!(run.code, Some(0), "{}", run.stderr);
    (tmp, out)
}

#[test]
fn layout_fixture_snapshot() {
    // Layers 1–2 start crossed (cherry needs banana, date needs apple, both in
    // loader order); the sweeps uncross them.
    let (_tmp, out) = fresh_graph("lexicon-build-snapshot");
    let json = fs::read_to_string(&out).unwrap();
    assert!(json.ends_with("}\n") && !json.ends_with("\n\n"));
    insta::assert_snapshot!("layout", json);
}

#[test]
fn two_builds_are_byte_identical() {
    let (_a, first) = fresh_graph("lexicon-build-twice-a");
    let (_b, second) = fresh_graph("lexicon-build-twice-b");
    assert_eq!(fs::read(first).unwrap(), fs::read(second).unwrap());
}

#[test]
fn the_default_output_sits_next_to_the_concept_directory() {
    let tmp = TempDir::new("lexicon-build-default-out");
    let concepts = tmp.path("content/concepts");
    fs::create_dir_all(&concepts).unwrap();
    fs::copy(
        fixture("valid").join("token.mdx"),
        concepts.join("token.mdx"),
    )
    .unwrap();

    let run = lexicon("build", &["--content", concepts.to_str().unwrap()], None);
    assert_eq!(run.code, Some(0), "{}", run.stderr);
    assert!(tmp.path("content/graph.json").is_file());
}

#[test]
fn invalid_content_is_reported_like_validate_and_nothing_is_written() {
    let tmp = TempDir::new("lexicon-build-invalid");
    let out = tmp.path("graph.json");
    let run = build("graph-errors", &out, &[]);
    assert_eq!(run.code, Some(1));
    assert_eq!(run.stderr_lines.len(), 3, "{}", run.stderr);
    assert!(!out.exists());
}

#[test]
fn check_passes_on_an_identical_file() {
    let (_tmp, out) = fresh_graph("lexicon-check-same");
    let run = build("layout", &out, &["--check"]);
    assert_eq!(run.code, Some(0), "{}", run.stderr);
}

#[test]
fn check_fails_with_a_unified_diff_on_a_modified_file() {
    let (_tmp, out) = fresh_graph("lexicon-check-modified");
    let stale = fs::read_to_string(&out)
        .unwrap()
        .replace("\"Fig\"", "\"Old fig\"");
    fs::write(&out, stale).unwrap();

    let run = build("layout", &out, &["--check"]);
    assert_eq!(run.code, Some(1));
    let label = out.display();
    assert!(
        run.stderr
            .contains(&format!("--- {label} (expected)\n+++ {label} (on disk)\n")),
        "{}",
        run.stderr
    );
    assert!(
        run.stderr.contains("\n-      \"title\": \"Fig\",\n"),
        "{}",
        run.stderr
    );
    assert!(
        run.stderr.contains("+      \"title\": \"Old fig\",\n"),
        "{}",
        run.stderr
    );
    // The file is left alone.
    assert!(fs::read_to_string(&out).unwrap().contains("Old fig"));
}

#[test]
fn check_flags_a_missing_trailing_newline() {
    let (_tmp, out) = fresh_graph("lexicon-check-newline");
    let json = fs::read_to_string(&out).unwrap();
    fs::write(&out, json.trim_end()).unwrap();

    let run = build("layout", &out, &["--check"]);
    assert_eq!(run.code, Some(1));
    assert!(
        run.stderr.contains("\\ No newline at end of file"),
        "{}",
        run.stderr
    );
}

#[test]
fn check_flags_crlf_line_endings() {
    let (_tmp, out) = fresh_graph("lexicon-check-crlf");
    let json = fs::read_to_string(&out).unwrap();
    fs::write(&out, json.replace('\n', "\r\n")).unwrap();

    let run = build("layout", &out, &["--check"]);
    assert_eq!(run.code, Some(1));
    assert!(run.stderr.contains("CRLF"), "{}", run.stderr);
}

#[test]
fn check_exits_2_on_a_missing_file() {
    let tmp = TempDir::new("lexicon-check-missing");
    let out = tmp.path("graph.json");
    let run = build("layout", &out, &["--check"]);
    assert_eq!(run.code, Some(2));
    assert!(run.stderr.contains("graph.json"), "{}", run.stderr);
    assert!(!out.exists());
}

#[test]
fn the_default_output_of_a_dot_content_dir_is_its_parent() {
    // `Path::new(".").parent()` is `""`: a lexical parent would put
    // graph.json inside the concept directory and break the next validate.
    let tmp = TempDir::new("lexicon-build-dot");
    let concepts = tmp.path("content/concepts");
    fs::create_dir_all(&concepts).unwrap();
    fs::copy(
        fixture("valid").join("token.mdx"),
        concepts.join("token.mdx"),
    )
    .unwrap();

    let run = lexicon("build", &["--content", "."], Some(&concepts));
    assert_eq!(run.code, Some(0), "{}", run.stderr);
    assert!(tmp.path("content/graph.json").is_file());
    assert!(!concepts.join("graph.json").exists());
}

#[test]
fn an_output_inside_the_concept_directory_is_refused() {
    let tmp = TempDir::new("lexicon-build-inside");
    let concepts = tmp.path("concepts");
    fs::create_dir_all(&concepts).unwrap();
    fs::copy(
        fixture("valid").join("token.mdx"),
        concepts.join("token.mdx"),
    )
    .unwrap();
    let out = concepts.join("graph.json");

    let run = lexicon(
        "build",
        &[
            "--content",
            concepts.to_str().unwrap(),
            "--out",
            out.to_str().unwrap(),
        ],
        None,
    );
    assert_eq!(run.code, Some(2));
    assert!(run.stderr.contains("concept directory"), "{}", run.stderr);
    assert!(!out.exists());
}

#[test]
fn a_build_leaves_only_graph_json_behind() {
    let (tmp, _out) = fresh_graph("lexicon-build-no-temp");
    let names: Vec<_> = fs::read_dir(&tmp.0)
        .unwrap()
        .map(|entry| entry.unwrap().file_name())
        .collect();
    assert_eq!(names, ["graph.json"]);
}

#[test]
fn check_gives_no_line_ending_hint_when_the_content_differs() {
    let (_tmp, out) = fresh_graph("lexicon-check-stray-cr");
    let json = fs::read_to_string(&out).unwrap();
    fs::write(&out, json.replace("\"Fig\"", "\"Fig\r\"")).unwrap();

    let run = build("layout", &out, &["--check"]);
    assert_eq!(run.code, Some(1));
    assert!(!run.stderr.contains("CRLF"), "{}", run.stderr);
}
