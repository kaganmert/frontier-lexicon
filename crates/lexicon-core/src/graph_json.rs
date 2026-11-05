//! `graph.json`: the concept graph with a fixed layout, for the site's map.
//!
//! The output is a pure function of the concepts: no timestamps, paths or tool
//! versions, so two builds of the same content are byte-identical on every
//! platform. The layout uses only `+ - * /`, `round`, comparisons and sorting
//! (no transcendental functions), and `serde_json` prints floats as the
//! shortest string that round-trips.

use std::collections::HashMap;

use serde::Serialize;

use crate::{Concept, EdgeType, LAYERS, Status, Track, is_layer};

/// Bumped whenever the shape of `graph.json` changes.
const VERSION: u32 = 1;

#[derive(Serialize)]
struct Graph<'a> {
    version: u32,
    layers: Vec<Layer>,
    nodes: Vec<Node<'a>>,
    edges: Vec<GraphEdge<'a>>,
}

#[derive(Serialize)]
struct Layer {
    layer: u8,
    name: &'static str,
}

/// Titles only: descriptions and questions of draft concepts must never reach
/// public output, and the map does not need them.
#[derive(Serialize)]
struct Node<'a> {
    slug: &'a str,
    title: &'a str,
    layer: u8,
    track: Track,
    status: Status,
    x: f64,
    y: f64,
}

#[derive(Serialize)]
struct GraphEdge<'a> {
    from: &'a str,
    to: &'a str,
    #[serde(rename = "type")]
    kind: EdgeType,
}

/// The contents of `graph.json` for `concepts`, which must be valid and in the
/// loader's canonical order (as [`crate::validate_dir`] returns them): pretty
/// JSON with two-space indentation and one trailing newline.
///
/// - `layers`: all of [`LAYERS`].
/// - `nodes`: one per concept, in input order, draft concepts included.
/// - `edges`: every prerequisite as a `PREREQUISITE_OF` edge from the
///   prerequisite to the concept, plus every typed edge, sorted by `from`,
///   `to` and type name.
/// - `x`, `y`: see [`layout`], rounded to 4 decimals.
///
/// # Panics
///
/// If a concept's layer is not in [`LAYERS`]; the loader never returns one.
pub fn graph_json(concepts: &[Concept]) -> String {
    for concept in concepts {
        assert!(
            is_layer(concept.layer),
            "{}: layer {} is not in LAYERS",
            concept.slug,
            concept.layer
        );
    }
    let nodes = concepts
        .iter()
        .zip(layout(concepts))
        .map(|(concept, (x, y))| Node {
            slug: &concept.slug,
            title: &concept.title,
            layer: concept.layer,
            track: concept.track,
            status: concept.status,
            x: round4(x),
            y: round4(y),
        })
        .collect();

    let mut edges: Vec<GraphEdge> = concepts
        .iter()
        .flat_map(|concept| {
            let prerequisites = concept.prerequisites.iter().map(|from| GraphEdge {
                from,
                to: &concept.slug,
                kind: EdgeType::PrerequisiteOf,
            });
            let typed = concept.edges.iter().map(|edge| GraphEdge {
                from: &concept.slug,
                to: &edge.to,
                kind: edge.kind,
            });
            prerequisites.chain(typed)
        })
        .collect();
    edges.sort_by(|a, b| (a.from, a.to, a.kind.as_str()).cmp(&(b.from, b.to, b.kind.as_str())));

    let graph = Graph {
        version: VERSION,
        layers: LAYERS
            .iter()
            .map(|&(layer, name)| Layer { layer, name })
            .collect(),
        nodes,
        edges,
    };
    let mut json = serde_json::to_string_pretty(&graph).expect("the graph is plain data");
    json.push('\n');
    json
}

/// Divisor for `y`: layer 1 sits at `y = 0`, the last layer at `y = 1`.
const LAST_LAYER: f64 = (LAYERS.len() - 1) as f64;

fn round4(value: f64) -> f64 {
    (value * 1e4).round() / 1e4
}

/// Normalised `(x, y)` in `[0, 1]` per concept, in the order of `concepts`.
///
/// `y = (layer - 1) / 9`, so layer 1 is at the top. Within a layer, nodes sit at `x = (rank + 0.5) / n`,
/// first in input order. One downward sweep (layers 2 to 10) then reorders
/// each layer by the mean `x` of each node's prerequisites in lower layers,
/// and one upward sweep (layers 9 to 1) by the mean `x` of the concepts in
/// higher layers that need it. A node with no such neighbours keeps its
/// current `x` as its key; ties go by track order, then slug. Same-layer
/// prerequisites do not affect the layout.
fn layout(concepts: &[Concept]) -> Vec<(f64, f64)> {
    let index: HashMap<&str, usize> = concepts
        .iter()
        .enumerate()
        .map(|(i, concept)| (concept.slug.as_str(), i))
        .collect();
    let mut lower = vec![Vec::new(); concepts.len()];
    let mut higher = vec![Vec::new(); concepts.len()];
    for (i, concept) in concepts.iter().enumerate() {
        for prerequisite in &concept.prerequisites {
            if let Some(&j) = index.get(prerequisite.as_str())
                && concepts[j].layer < concept.layer
            {
                lower[i].push(j);
                higher[j].push(i);
            }
        }
    }

    let mut rows: Vec<Vec<usize>> = LAYERS
        .iter()
        .map(|&(layer, _)| {
            (0..concepts.len())
                .filter(|&i| concepts[i].layer == layer)
                .collect()
        })
        .collect();
    let mut x = vec![0.0; concepts.len()];
    for row in &rows {
        place(row, &mut x);
    }
    for row in rows.iter_mut().skip(1) {
        reorder(row, &lower, &mut x, concepts);
    }
    for row in rows.iter_mut().rev().skip(1) {
        reorder(row, &higher, &mut x, concepts);
    }

    concepts
        .iter()
        .enumerate()
        .map(|(i, concept)| (x[i], f64::from(concept.layer - 1) / LAST_LAYER))
        .collect()
}

/// Sorts `row` by the mean `x` of each node's `neighbours`, then places it.
fn reorder(row: &mut [usize], neighbours: &[Vec<usize>], x: &mut [f64], concepts: &[Concept]) {
    let barycenter: HashMap<usize, f64> = row
        .iter()
        .map(|&i| {
            let adjacent = &neighbours[i];
            let mean = if adjacent.is_empty() {
                x[i]
            } else {
                adjacent.iter().map(|&j| x[j]).sum::<f64>() / adjacent.len() as f64
            };
            (i, mean)
        })
        .collect();
    row.sort_by(|&a, &b| {
        barycenter[&a]
            .total_cmp(&barycenter[&b])
            .then_with(|| concepts[a].track.rank().cmp(&concepts[b].track.rank()))
            .then_with(|| concepts[a].slug.cmp(&concepts[b].slug))
    });
    place(row, x);
}

/// `x = (rank + 0.5) / n`: evenly spread, a single node at 0.5.
fn place(row: &[usize], x: &mut [f64]) {
    let n = row.len() as f64;
    for (rank, &i) in row.iter().enumerate() {
        x[i] = (rank as f64 + 0.5) / n;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{Provenance, Status, Track};

    fn concept(slug: &str, layer: u8, prerequisites: &[&str]) -> Concept {
        Concept {
            path: format!("{slug}.mdx").into(),
            slug: slug.to_owned(),
            title: slug.to_owned(),
            description: "d".to_owned(),
            layer,
            track: Track::Shared,
            status: Status::Draft,
            question: "q".to_owned(),
            aliases: vec![],
            prerequisites: prerequisites.iter().map(|&s| s.to_owned()).collect(),
            edges: vec![],
            sources: vec![],
            provenance: Provenance::Seed,
            body: String::new(),
        }
    }

    #[test]
    #[should_panic(expected = "layer 0")]
    fn a_layer_outside_layers_panics() {
        graph_json(&[concept("a", 0, &[])]);
    }

    #[test]
    fn a_single_node_layer_sits_in_the_middle() {
        let concepts = [
            concept("a", 1, &[]),
            concept("b", 1, &[]),
            concept("c", 2, &["a"]),
        ];
        assert_eq!(layout(&concepts)[2].0, 0.5);
    }
}
