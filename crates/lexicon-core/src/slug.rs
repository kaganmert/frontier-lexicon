/// Whether `s` is a valid concept slug: lowercase kebab-case, the only shape a
/// slug (and so a concept file name) may take.
///
/// Equivalent to the pattern `^[a-z0-9]+(?:-[a-z0-9]+)*$`, which must stay
/// literally identical to `slugPattern` in `apps/web/lib/concept-model.ts`,
/// which points back here.
pub fn is_valid_slug(s: &str) -> bool {
    !s.is_empty()
        && s.split('-').all(|part| {
            !part.is_empty()
                && part
                    .bytes()
                    .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit())
        })
}

#[cfg(test)]
mod tests {
    use super::is_valid_slug;

    #[test]
    fn accepts_lowercase_kebab_case() {
        for slug in ["a", "kv-cache", "gpt-4o", "2024-models", "x1-y2-z3"] {
            assert!(is_valid_slug(slug), "{slug}");
        }
    }

    #[test]
    fn rejects_everything_else() {
        for slug in [
            "", "-", "-a", "a-", "a--b", "Kv-cache", "kv_cache", "kv cache", "kv.cache", "ş", "a/b",
        ] {
            assert!(!is_valid_slug(slug), "{slug:?}");
        }
    }
}
