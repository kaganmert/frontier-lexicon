//! Helpers shared by the CLI integration tests.

#![allow(dead_code)] // each test binary uses a different subset

use std::path::{Path, PathBuf};

use assert_cmd::Command;

pub fn fixture(case: &str) -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("tests/fixtures")
        .join(case)
}

pub struct Run {
    pub code: Option<i32>,
    pub stdout: String,
    pub stderr: String,
    pub stderr_lines: Vec<String>,
}

/// Runs `lexicon <subcommand> <args>` in `cwd` (the test's own directory if
/// `None`).
pub fn lexicon(subcommand: &str, args: &[&str], cwd: Option<&Path>) -> Run {
    let mut cmd = Command::cargo_bin("lexicon").unwrap();
    cmd.arg(subcommand).args(args);
    if let Some(cwd) = cwd {
        cmd.current_dir(cwd);
    }
    let output = cmd.output().unwrap();
    let stderr = String::from_utf8(output.stderr).unwrap();
    Run {
        code: output.status.code(),
        stdout: String::from_utf8(output.stdout).unwrap(),
        stderr_lines: stderr.lines().map(str::to_owned).collect(),
        stderr,
    }
}

/// A scratch directory removed on drop, so a failing test leaves nothing behind.
pub struct TempDir(pub PathBuf);

impl TempDir {
    pub fn new(name: &str) -> Self {
        let dir = std::env::temp_dir().join(format!("{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        TempDir(dir)
    }

    pub fn path(&self, name: &str) -> PathBuf {
        self.0.join(name)
    }
}

impl Drop for TempDir {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.0);
    }
}
