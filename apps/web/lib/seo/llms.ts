import {
  conceptMarkdownPath,
  conceptPath,
  sortConcepts,
  type Concept,
  type ConceptSummary,
} from "../concept-model";
import { absoluteUrl, layerName, siteDescription, siteName } from "../site";
import { conceptToMarkdown } from "./markdown";

const EMPTY_STATE = "No concepts have been published yet.";

function header(): string {
  return `# ${siteName}\n\n> ${siteDescription}`;
}

function conceptLine(concept: ConceptSummary): string {
  const page = absoluteUrl(conceptPath(concept.slug));
  const markdown = absoluteUrl(conceptMarkdownPath(concept.slug));
  return `- [${concept.title}](${page}): ${concept.description} ([Markdown](${markdown}))`;
}

function groupByLayer(
  concepts: readonly ConceptSummary[],
): Map<number, ConceptSummary[]> {
  const groups = new Map<number, ConceptSummary[]>();
  for (const concept of sortConcepts(concepts)) {
    const group = groups.get(concept.layer) ?? [];
    group.push(concept);
    groups.set(concept.layer, group);
  }
  return groups;
}

/** `/llms.txt` as described at https://llmstxt.org/ */
export function buildLlmsTxt(concepts: readonly ConceptSummary[]): string {
  const sections: string[] = [
    header(),
    "Concepts are grouped by layer, from model fundamentals (layer 1) to research vocabulary (layer 10). A `PREREQUISITE_OF` edge always points from a lower layer to a higher one, so the layers double as a learning order. Every page is also available as plain Markdown at the link next to it.",
  ];

  const groups = groupByLayer(concepts);
  if (groups.size === 0) {
    sections.push(`## Concepts\n\n${EMPTY_STATE}`);
  }
  for (const [layer, members] of groups) {
    sections.push(
      `## Layer ${layer}: ${layerName(layer)}\n\n${members.map(conceptLine).join("\n")}`,
    );
  }

  sections.push(
    [
      "## Optional",
      "",
      `- [Concept index](${absoluteUrl("/concepts/")}): every concept on one page`,
      `- [Full content](${absoluteUrl("/llms-full.txt")}): all concept pages as one Markdown file`,
    ].join("\n"),
  );

  return `${sections.join("\n\n")}\n`;
}

/** `/llms-full.txt`: every lesson's Markdown in one file. */
export function buildLlmsFullTxt(concepts: readonly Concept[]): string {
  const ordered = sortConcepts(concepts);
  if (ordered.length === 0) {
    return `${header()}\n\n${EMPTY_STATE}\n`;
  }
  const docs = ordered.map((concept) =>
    conceptToMarkdown(concept).replace(/\n+$/, ""),
  );
  return `${[header(), ...docs].join("\n\n---\n\n")}\n`;
}
