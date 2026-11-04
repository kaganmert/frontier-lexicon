//! Rules that span concepts: references, layer order and acyclic prerequisites.

use std::collections::{BTreeSet, HashMap, HashSet};
use std::fmt;
use std::path::{Path, PathBuf};

use petgraph::algo::tarjan_scc;
use petgraph::graphmap::DiGraphMap;

use crate::{Concept, EdgeType};

/// One violated graph rule, reported against the file that declares it.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GraphError {
    pub path: PathBuf,
    pub message: String,
}

impl fmt::Display for GraphError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}: {}", self.path.display(), self.message)
    }
}

impl std::error::Error for GraphError {}

/// A directed edge after `prerequisites` are expanded, with the file that
/// declares it.
struct Link<'a> {
    from: &'a str,
    to: &'a str,
    kind: EdgeType,
    declared_in: &'a Path,
}

/// Checks the graph rules over a complete set of concepts, in this order:
///
/// 1. every slug in `prerequisites` and `edges[].to` names a concept;
/// 2. no concept references itself;
/// 3. no (`from`, `to`, `type`) edge is declared twice;
/// 4. a `PREREQUISITE_OF` edge never points from a higher layer to a lower one
///    (same-layer prerequisites are allowed);
/// 5. the `PREREQUISITE_OF` subgraph has no cycles.
///
/// An entry failing rule 1 or 2 is reported once and left out of rules 3–5.
/// Every repeat of an edge is reported, and only the first counts for rules
/// 4 and 5. Rule 5 reports one cycle per strongly connected component, even
/// when the component holds several cycles.
pub fn validate_graph(concepts: &[Concept]) -> Vec<GraphError> {
    let by_slug: HashMap<&str, &Concept> = concepts.iter().map(|c| (c.slug.as_str(), c)).collect();
    let mut errors = Vec::new();
    let mut error = |path: &Path, message: String| {
        errors.push(GraphError {
            path: path.to_owned(),
            message,
        })
    };

    // Rules 1 and 2, per entry.
    let mut links = Vec::new();
    for concept in concepts {
        let path = concept.path.as_path();
        for slug in &concept.prerequisites {
            if *slug == concept.slug {
                error(path, "lists itself under prerequisites".to_owned());
            } else if !by_slug.contains_key(slug.as_str()) {
                error(
                    path,
                    format!("prerequisite \"{slug}\" is not a known concept"),
                );
            } else {
                links.push(Link {
                    from: slug,
                    to: &concept.slug,
                    kind: EdgeType::PrerequisiteOf,
                    declared_in: path,
                });
            }
        }
        for edge in &concept.edges {
            let kind = edge.kind.as_str();
            if edge.to == concept.slug {
                error(path, format!("{kind} edge points to itself"));
            } else if !by_slug.contains_key(edge.to.as_str()) {
                error(
                    path,
                    format!("{kind} edge to \"{}\": not a known concept", edge.to),
                );
            } else {
                links.push(Link {
                    from: &concept.slug,
                    to: &edge.to,
                    kind: edge.kind,
                    declared_in: path,
                });
            }
        }
    }

    // Rule 3.
    let mut seen = HashSet::new();
    links.retain(|link| {
        let fresh = seen.insert((link.from, link.to, link.kind));
        if !fresh {
            error(
                link.declared_in,
                format!(
                    "duplicate edge {} {} {}",
                    link.from,
                    link.kind.as_str(),
                    link.to
                ),
            );
        }
        fresh
    });

    // Rule 4.
    let prerequisites: Vec<&Link> = links
        .iter()
        .filter(|link| link.kind == EdgeType::PrerequisiteOf)
        .collect();
    for link in &prerequisites {
        let (from, to) = (by_slug[link.from], by_slug[link.to]);
        if from.layer > to.layer {
            error(
                link.declared_in,
                format!(
                    "prerequisite \"{}\" (layer {}) is in a higher layer than \"{}\" (layer {})",
                    from.slug, from.layer, to.slug, to.layer
                ),
            );
        }
    }

    // Rule 5.
    let graph: DiGraphMap<&str, ()> = prerequisites
        .iter()
        .map(|link| (link.from, link.to))
        .collect();
    let mut cycles: Vec<Vec<&str>> = tarjan_scc(&graph)
        .into_iter()
        .filter(|scc| scc.len() >= 2)
        .map(|scc| cycle_in(&graph, &scc.into_iter().collect()))
        .collect();
    cycles.sort();
    for cycle in cycles {
        error(
            &by_slug[cycle[0]].path,
            format!("prerequisite cycle: {}", cycle.join(" → ")),
        );
    }

    errors
}

/// One cycle inside a strongly connected component: a depth-first walk from
/// the smallest slug, confined to the component and visiting neighbours in
/// slug byte order, so the result is deterministic. Returned closed, with the
/// start repeated at the end.
fn cycle_in<'a>(graph: &DiGraphMap<&'a str, ()>, scc: &BTreeSet<&'a str>) -> Vec<&'a str> {
    let start = *scc.first().expect("a component has nodes");
    let mut path = vec![start];
    let mut visited = HashSet::from([start]);
    // Each frame holds the neighbours of the node at the same depth of `path`
    // still to try, in reverse so `pop` yields the smallest first.
    let mut pending = vec![neighbours(graph, scc, start)];
    while let Some(frame) = pending.last_mut() {
        match frame.pop() {
            Some(next) if next == start => {
                path.push(start);
                return path;
            }
            Some(next) => {
                if visited.insert(next) {
                    path.push(next);
                    pending.push(neighbours(graph, scc, next));
                }
            }
            None => {
                pending.pop();
                path.pop();
            }
        }
    }
    unreachable!("every node of a strongly connected component lies on a cycle")
}

fn neighbours<'a>(
    graph: &DiGraphMap<&'a str, ()>,
    scc: &BTreeSet<&'a str>,
    node: &'a str,
) -> Vec<&'a str> {
    let mut next: Vec<&str> = graph.neighbors(node).filter(|n| scc.contains(n)).collect();
    next.sort_unstable_by(|a, b| b.as_bytes().cmp(a.as_bytes()));
    next
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{Edge, EdgeType, Provenance, Status, Track};

    fn concept(
        slug: &str,
        layer: u8,
        prerequisites: &[&str],
        edges: &[(EdgeType, &str)],
    ) -> Concept {
        Concept {
            path: PathBuf::from(format!("content/concepts/{slug}.mdx")),
            slug: slug.to_owned(),
            title: slug.to_owned(),
            description: "d".to_owned(),
            layer,
            track: Track::Shared,
            status: Status::Draft,
            question: "q".to_owned(),
            aliases: Vec::new(),
            prerequisites: prerequisites.iter().map(|s| (*s).to_owned()).collect(),
            edges: edges
                .iter()
                .map(|(kind, to)| Edge {
                    kind: *kind,
                    to: (*to).to_owned(),
                })
                .collect(),
            sources: Vec::new(),
            provenance: Provenance::Seed,
            body: String::new(),
        }
    }

    fn messages(concepts: &[Concept]) -> Vec<String> {
        validate_graph(concepts)
            .iter()
            .map(ToString::to_string)
            .collect()
    }

    #[test]
    fn a_consistent_graph_passes() {
        let concepts = [
            concept("token", 1, &[], &[]),
            concept(
                "context-window",
                2,
                &["token"],
                &[(EdgeType::RelatedTo, "token")],
            ),
            concept("kv-cache", 2, &["context-window"], &[]),
        ];
        assert_eq!(messages(&concepts), Vec::<String>::new());
    }

    #[test]
    fn a_dangling_prerequisite_is_one_error_without_layer_or_cycle_noise() {
        let concepts = [concept("context-window", 2, &["token"], &[])];
        assert_eq!(
            messages(&concepts),
            ["content/concepts/context-window.mdx: prerequisite \"token\" is not a known concept"]
        );
    }

    #[test]
    fn a_dangling_edge_target_is_reported() {
        let concepts = [concept(
            "token",
            1,
            &[],
            &[(EdgeType::Causes, "context-rot")],
        )];
        assert_eq!(
            messages(&concepts),
            ["content/concepts/token.mdx: CAUSES edge to \"context-rot\": not a known concept"]
        );
    }

    #[test]
    fn a_repeated_dangling_slug_yields_two_existence_errors() {
        let concepts = [concept(
            "token",
            1,
            &[],
            &[(EdgeType::RelatedTo, "byte"), (EdgeType::RelatedTo, "byte")],
        )];
        let errors = messages(&concepts);
        assert_eq!(errors.len(), 2, "{errors:?}");
        assert!(errors.iter().all(|e| e.contains("not a known concept")));
    }

    #[test]
    fn self_references_are_reported_once_and_not_as_cycles() {
        let concepts = [concept(
            "token",
            1,
            &["token"],
            &[(EdgeType::RelatedTo, "token")],
        )];
        assert_eq!(
            messages(&concepts),
            [
                "content/concepts/token.mdx: lists itself under prerequisites",
                "content/concepts/token.mdx: RELATED_TO edge points to itself",
            ]
        );
    }

    #[test]
    fn duplicate_edges_are_reported_but_reverse_pairs_and_other_types_are_not() {
        let concepts = [
            concept(
                "a",
                1,
                &[],
                &[
                    (EdgeType::RelatedTo, "b"),
                    (EdgeType::RelatedTo, "b"),
                    (EdgeType::Causes, "b"),
                ],
            ),
            concept("b", 1, &[], &[(EdgeType::RelatedTo, "a")]),
        ];
        assert_eq!(
            messages(&concepts),
            ["content/concepts/a.mdx: duplicate edge a RELATED_TO b"]
        );
    }

    #[test]
    fn a_repeated_prerequisite_is_a_duplicate_edge() {
        let concepts = [
            concept("token", 1, &[], &[]),
            concept("byte-pair", 1, &["token", "token"], &[]),
        ];
        assert_eq!(
            messages(&concepts),
            ["content/concepts/byte-pair.mdx: duplicate edge token PREREQUISITE_OF byte-pair"]
        );
    }

    #[test]
    fn a_backward_prerequisite_names_both_slugs_and_layers() {
        let concepts = [
            concept("kv-cache", 3, &[], &[]),
            concept("token", 1, &["kv-cache"], &[]),
        ];
        assert_eq!(
            messages(&concepts),
            [
                "content/concepts/token.mdx: prerequisite \"kv-cache\" (layer 3) is in a higher layer than \"token\" (layer 1)"
            ]
        );
    }

    #[test]
    fn a_same_layer_prerequisite_passes() {
        let concepts = [
            concept("token", 1, &[], &[]),
            concept("byte-pair", 1, &["token"], &[]),
        ];
        assert!(messages(&concepts).is_empty());
    }

    #[test]
    fn a_three_cycle_is_one_error_naming_the_cycle_from_the_smallest_slug() {
        // b needs a, c needs b, a needs c: a → b → c → a.
        let concepts = [
            concept("c", 2, &["b"], &[]),
            concept("a", 2, &["c"], &[]),
            concept("b", 2, &["a"], &[]),
        ];
        assert_eq!(
            messages(&concepts),
            ["content/concepts/a.mdx: prerequisite cycle: a → b → c → a"]
        );
    }

    #[test]
    fn each_strongly_connected_component_is_reported_once() {
        // Two separate cycles, one of them with a chord (two cycles through the same nodes).
        let concepts = [
            concept("a", 1, &["b"], &[]),
            concept("b", 1, &["a"], &[]),
            concept("x", 1, &["z"], &[]),
            concept("y", 1, &["x"], &[]),
            concept("z", 1, &["y", "x"], &[]),
        ];
        let mut errors = messages(&concepts);
        errors.sort();
        assert_eq!(
            errors,
            [
                "content/concepts/a.mdx: prerequisite cycle: a → b → a",
                "content/concepts/x.mdx: prerequisite cycle: x → y → z → x",
            ]
        );
    }
}
