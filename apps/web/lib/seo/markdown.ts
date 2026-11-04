import { conceptPath, type Concept } from "../concept-model";
import { absoluteUrl } from "../site";

/** JSON string literals are valid double-quoted YAML scalars. */
const yamlString = (value: string) => JSON.stringify(value);

/**
 * Plain-Markdown rendering of a lesson page: a YAML front matter block that
 * repeats the graph metadata, the title as the only H1, the description as a
 * blockquote, then the body verbatim. Bodies start at H2.
 */
export function conceptToMarkdown(concept: Concept): string {
  const frontMatter = [
    "---",
    `title: ${yamlString(concept.title)}`,
    `slug: ${yamlString(concept.slug)}`,
    `description: ${yamlString(concept.description)}`,
    `layer: ${concept.layer}`,
    `track: ${yamlString(concept.track)}`,
    `canonical: ${yamlString(absoluteUrl(conceptPath(concept.slug)))}`,
    "---",
  ].join("\n");

  const body = concept.body.trim();
  const sections = [
    frontMatter,
    `# ${concept.title}`,
    `> ${concept.description}`,
    ...(body === "" ? [] : [body]),
  ];

  return `${sections.join("\n\n")}\n`;
}
