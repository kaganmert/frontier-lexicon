import {
  conceptPath,
  conceptsIndexPath,
  type ConceptSummary,
} from "../concept-model";
import { absoluteUrl, siteDescription, siteName } from "../site";

const SCHEMA = "https://schema.org";

const termSetId = () => `${absoluteUrl(conceptsIndexPath)}#set`;

function termSet() {
  return {
    "@type": "DefinedTermSet",
    "@id": termSetId(),
    name: `${siteName} concepts`,
    url: absoluteUrl(conceptsIndexPath),
  };
}

export function definedTermJsonLd(concept: ConceptSummary) {
  const url = absoluteUrl(conceptPath(concept.slug));
  return {
    "@context": SCHEMA,
    "@type": "DefinedTerm",
    "@id": `${url}#term`,
    name: concept.title,
    description: concept.description,
    termCode: concept.slug,
    url,
    inDefinedTermSet: termSet(),
  };
}

function termRef(concept: ConceptSummary) {
  const url = absoluteUrl(conceptPath(concept.slug));
  return {
    "@type": "DefinedTerm",
    "@id": `${url}#term`,
    name: concept.title,
    termCode: concept.slug,
    url,
  };
}

export function definedTermSetJsonLd(concepts: readonly ConceptSummary[]) {
  return {
    "@context": SCHEMA,
    ...termSet(),
    hasDefinedTerm: concepts.map(termRef),
  };
}

export function breadcrumbJsonLd(concept: ConceptSummary) {
  const trail = [
    { name: "Home", item: absoluteUrl("/") },
    { name: "Concepts", item: absoluteUrl(conceptsIndexPath) },
    { name: concept.title, item: absoluteUrl(conceptPath(concept.slug)) },
  ];
  return {
    "@context": SCHEMA,
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      ...crumb,
    })),
  };
}

export function websiteJsonLd() {
  return {
    "@context": SCHEMA,
    "@type": "WebSite",
    "@id": `${absoluteUrl("/")}#website`,
    name: siteName,
    url: absoluteUrl("/"),
    description: siteDescription,
    inLanguage: "en",
  };
}
