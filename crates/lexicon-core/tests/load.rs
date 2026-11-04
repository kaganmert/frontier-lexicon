use std::path::{Path, PathBuf};

use lexicon_core::{EdgeType, LoadError, Provenance, Status, Track, load_concepts};

fn fixture(case: &str) -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("tests/fixtures")
        .join(case)
}

#[test]
fn loads_every_field_of_a_full_concept() {
    let dir = fixture("valid-full");
    let concepts = load_concepts(&dir).unwrap();
    assert_eq!(concepts.len(), 1);
    let c = &concepts[0];
    assert_eq!(c.path, dir.join("context-window.mdx"));
    assert_eq!(c.slug, "context-window");
    assert_eq!(c.title, "Context window");
    assert_eq!(c.layer, 2);
    assert_eq!(c.track, Track::Shared);
    assert_eq!(c.status, Status::Published);
    assert_eq!(c.provenance, Provenance::Seed);
    assert_eq!(c.aliases, ["context length", "context size"]);
    assert_eq!(c.prerequisites, ["token"]);
    assert_eq!(c.edges.len(), 2);
    assert_eq!(c.edges[0].kind, EdgeType::Causes);
    assert_eq!(c.edges[0].to, "context-rot");
    assert_eq!(c.sources.len(), 1);
    assert_eq!(
        c.sources[0].url,
        "https://docs.claude.com/en/docs/build-with-claude/context-windows"
    );
    assert!(c.body.starts_with("\n## What it is\n"));
    assert!(c.body.ends_with("hard limit is reached.\n"));
}

#[test]
fn optional_fields_default_to_empty() {
    let concepts = load_concepts(&fixture("valid-minimal")).unwrap();
    let c = &concepts[0];
    assert_eq!(c.slug, "token");
    assert_eq!(c.status, Status::Draft);
    assert_eq!(c.provenance, Provenance::Manual);
    assert!(c.aliases.is_empty() && c.prerequisites.is_empty());
    assert!(c.edges.is_empty() && c.sources.is_empty());
    assert_eq!(c.body, "");
}

#[test]
fn missing_directory_is_an_io_error() {
    let err = load_concepts(&fixture("does-not-exist")).unwrap_err();
    assert!(matches!(err, LoadError::Io(_)), "{err:?}");
}

fn content_errors(case: &str) -> Vec<lexicon_core::ContentError> {
    match load_concepts(&fixture(case)) {
        Err(LoadError::Content(errors)) => errors,
        other => panic!("{case}: expected content errors, got {other:?}"),
    }
}

/// One fixture directory per schema rule: (case, file, field, message excerpt).
const RULES: &[(&str, &str, Option<&str>, &str)] = &[
    (
        "unknown-field",
        "token.mdx",
        None,
        "unknown field `difficulty`",
    ),
    (
        "unknown-edge-field",
        "token.mdx",
        None,
        "unknown field `weight`",
    ),
    (
        "unknown-source-field",
        "token.mdx",
        None,
        "unknown field `year`",
    ),
    (
        "missing-status",
        "token.mdx",
        None,
        "missing field `status`",
    ),
    ("invalid-status", "token.mdx", None, "review"),
    (
        "missing-provenance",
        "token.mdx",
        None,
        "missing field `provenance`",
    ),
    ("invalid-provenance", "token.mdx", None, "scraped"),
    ("invalid-track", "token.mdx", None, "theory"),
    ("empty-title", "token.mdx", None, "null"),
    (
        "quoted-empty-title",
        "token.mdx",
        Some("title"),
        "must not be empty",
    ),
    (
        "multi-line-title",
        "token.mdx",
        Some("title"),
        "single line",
    ),
    (
        "empty-description",
        "token.mdx",
        Some("description"),
        "must not be empty",
    ),
    (
        "multi-line-description",
        "token.mdx",
        Some("description"),
        "single line",
    ),
    (
        "long-description",
        "token.mdx",
        Some("description"),
        "UTF-16 units (got 161)",
    ),
    ("layer-0", "token.mdx", Some("layer"), "between 1 and 10"),
    ("layer-11", "token.mdx", Some("layer"), "between 1 and 10"),
    (
        "missing-question",
        "token.mdx",
        None,
        "missing field `question`",
    ),
    (
        "empty-question",
        "token.mdx",
        Some("question"),
        "must not be empty",
    ),
    (
        "bad-file-name",
        "Byte_Pair.mdx",
        None,
        "lowercase kebab-case",
    ),
    (
        "slug-mismatch",
        "token.mdx",
        Some("slug"),
        "does not match the file name",
    ),
    (
        "subdirectory",
        "nested",
        None,
        "subdirectories are not allowed",
    ),
    ("non-mdx-file", "token.md", None, "<slug>.mdx"),
    (
        "no-front-matter",
        "token.mdx",
        None,
        "must start with a `---` line",
    ),
    ("unterminated-front-matter", "token.mdx", None, "not closed"),
    (
        "empty-front-matter",
        "token.mdx",
        None,
        "front matter is empty",
    ),
    ("non-utf8", "token.mdx", None, "UTF-8"),
    ("null-aliases", "token.mdx", None, "line 9"),
    (
        "empty-alias",
        "token.mdx",
        Some("aliases[0]"),
        "must not be empty",
    ),
    (
        "duplicate-alias",
        "token.mdx",
        Some("aliases[1]"),
        "listed twice",
    ),
    (
        "alias-equals-title",
        "token.mdx",
        Some("aliases[0]"),
        "repeat the title",
    ),
    (
        "bad-prerequisite",
        "token.mdx",
        Some("prerequisites[0]"),
        "kebab-case",
    ),
    (
        "duplicate-prerequisite",
        "token.mdx",
        Some("prerequisites[1]"),
        "listed twice",
    ),
    (
        "bad-edge-to",
        "token.mdx",
        Some("edges[0].to"),
        "kebab-case",
    ),
    ("unknown-edge-type", "token.mdx", None, "CONTRADICTS"),
    (
        "prerequisite-of-edge",
        "token.mdx",
        Some("edges[0].type"),
        "PREREQUISITE_OF",
    ),
    (
        "empty-source-title",
        "token.mdx",
        Some("sources[0].title"),
        "must not be empty",
    ),
    (
        "relative-source-url",
        "token.mdx",
        Some("sources[0].url"),
        "not an absolute URL",
    ),
    (
        "ftp-source-url",
        "token.mdx",
        Some("sources[0].url"),
        "http or https",
    ),
    ("missing-title", "token.mdx", None, "missing field `title`"),
    (
        "missing-description",
        "token.mdx",
        None,
        "missing field `description`",
    ),
    ("missing-layer", "token.mdx", None, "missing field `layer`"),
    ("missing-track", "token.mdx", None, "missing field `track`"),
    (
        "multi-line-question",
        "token.mdx",
        Some("question"),
        "single line",
    ),
    (
        "multi-line-alias",
        "token.mdx",
        Some("aliases[0]"),
        "single line",
    ),
    (
        "multi-line-source-title",
        "token.mdx",
        Some("sources[0].title"),
        "single line",
    ),
    (
        "blank-title",
        "token.mdx",
        Some("title"),
        "must not be empty",
    ),
    ("unquoted-number-title", "token.mdx", None, "must be quoted"),
    (
        "long-description-utf16",
        "token.mdx",
        Some("description"),
        "UTF-16 units (got 162)",
    ),
    ("byte-order-mark", "token.mdx", None, "byte order mark"),
    (
        "multi-line-source-url",
        "token.mdx",
        Some("sources[0].url"),
        "line breaks",
    ),
    (
        "spaced-source-url",
        "token.mdx",
        Some("sources[0].url"),
        "spaces",
    ),
];

#[test]
fn every_rule_has_a_fixture_that_breaks_only_that_rule() {
    let mut failures = Vec::new();
    for &(case, file, field, excerpt) in RULES {
        let errors = content_errors(case);
        let ok = errors.len() == 1
            && errors[0].path == fixture(case).join(file)
            && errors[0].field.as_deref() == field
            && errors[0].message.contains(excerpt);
        if !ok {
            failures.push(format!("{case}: {errors:#?}"));
        }
    }
    assert!(failures.is_empty(), "{}", failures.join("\n"));
}

#[test]
fn reports_every_broken_file_in_file_name_order() {
    let errors = content_errors("three-broken");
    let files: Vec<_> = errors.iter().map(|e| e.path.clone()).collect();
    let dir = fixture("three-broken");
    assert_eq!(
        files,
        [
            dir.join("alpha.mdx"),
            dir.join("beta.mdx"),
            dir.join("gamma.mdx")
        ]
    );
    assert_eq!(errors[0].field.as_deref(), Some("layer"));
    assert_eq!(errors[2].field.as_deref(), Some("sources[0].url"));
}

#[test]
fn deserialisation_errors_point_at_the_file_line() {
    let errors = content_errors("unknown-field");
    // `difficulty:` is line 9 of the file: the opening `---` is line 1.
    assert!(
        errors[0].message.contains("line 9"),
        "{}",
        errors[0].message
    );
}

#[test]
fn content_error_display_names_path_and_field() {
    let errors = content_errors("layer-0");
    let path = fixture("layer-0").join("token.mdx");
    assert_eq!(
        errors[0].to_string(),
        format!(
            "{}: layer: must be between 1 and 10 (got 0)",
            path.display()
        )
    );
    let errors = content_errors("non-utf8");
    assert_eq!(
        errors[0].to_string(),
        format!(
            "{}: file is not valid UTF-8",
            fixture("non-utf8").join("token.mdx").display()
        )
    );
}

#[test]
fn ignores_dotfiles() {
    assert_eq!(load_concepts(&fixture("dotfile")).unwrap().len(), 1);
}

#[test]
fn accepts_crlf_line_endings() {
    let concepts = load_concepts(&fixture("crlf")).unwrap();
    assert_eq!(concepts[0].title, "Token");
    assert_eq!(concepts[0].body, "\r\n## Token\r\n");
}

#[test]
fn description_length_counts_utf16_units() {
    // 160 characters of two UTF-8 bytes but one UTF-16 unit each: within the limit.
    let concepts = load_concepts(&fixture("description-160")).unwrap();
    assert_eq!(concepts[0].description.encode_utf16().count(), 160);
}

#[test]
fn sorts_by_layer_then_track_then_slug() {
    let slugs: Vec<_> = load_concepts(&fixture("ordering"))
        .unwrap()
        .into_iter()
        .map(|c| c.slug)
        .collect();
    assert_eq!(slugs, ["delta", "eta", "gamma", "zeta", "beta", "alpha"]);
}
