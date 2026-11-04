//! Splitting a concept file into its YAML front matter and MDX body.

/// A concept file cut at its front matter delimiters.
#[derive(Debug, PartialEq, Eq)]
pub(crate) struct Split<'a> {
    pub yaml: &'a str,
    pub body: &'a str,
}

/// Line 1 must be exactly `---`; the block ends at the next line that is
/// exactly `---`. LF and CRLF line endings are both accepted. Everything after
/// the closing line is the body, untouched.
pub(crate) fn split(text: &str) -> Result<Split<'_>, &'static str> {
    let mut lines = text.split_inclusive('\n');
    let first = lines.next().unwrap_or("");
    if strip_line_ending(first) != "---" {
        return Err("file must start with a `---` line opening the front matter");
    }
    let yaml_start = first.len();
    let mut offset = yaml_start;
    for line in lines {
        if strip_line_ending(line) == "---" {
            let yaml = &text[yaml_start..offset];
            if yaml.trim().is_empty() {
                return Err("front matter is empty");
            }
            return Ok(Split {
                yaml,
                body: &text[offset + line.len()..],
            });
        }
        offset += line.len();
    }
    Err("front matter is not closed by a `---` line")
}

fn strip_line_ending(line: &str) -> &str {
    let line = line.strip_suffix('\n').unwrap_or(line);
    line.strip_suffix('\r').unwrap_or(line)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn splits_lf_and_crlf() {
        let lf = split("---\na: 1\n---\nbody\n").unwrap();
        assert_eq!(
            lf,
            Split {
                yaml: "a: 1\n",
                body: "body\n"
            }
        );
        let crlf = split("---\r\na: 1\r\n---\r\nbody\r\n").unwrap();
        assert_eq!(
            crlf,
            Split {
                yaml: "a: 1\r\n",
                body: "body\r\n"
            }
        );
    }

    #[test]
    fn closing_line_may_end_the_file() {
        assert_eq!(split("---\na: 1\n---").unwrap().body, "");
    }

    #[test]
    fn delimiters_must_be_exact() {
        assert!(split("--- \na: 1\n---\n").is_err());
        assert!(split("\n---\na: 1\n---\n").is_err());
        assert!(split("---\na: 1\n----\n").is_err());
        assert!(split("---\n---\n").is_err());
        assert!(split("").is_err());
    }
}
