import { describe, expect, it } from "vitest";
import { contextWindow, sycophancy } from "./fixtures";
import {
  breadcrumbJsonLd,
  definedTermJsonLd,
  definedTermSetJsonLd,
  websiteJsonLd,
} from "./jsonld";

describe("definedTermJsonLd", () => {
  it("describes a concept as a schema.org DefinedTerm inside the site's term set", () => {
    expect(definedTermJsonLd(contextWindow)).toEqual({
      "@context": "https://schema.org",
      "@type": "DefinedTerm",
      "@id": "https://lexicon.kaganmert.com/concepts/context-window/#term",
      name: "Context window",
      description:
        "The maximum number of tokens a model can read and write in one request, and why running out of it degrades answers.",
      termCode: "context-window",
      url: "https://lexicon.kaganmert.com/concepts/context-window/",
      inDefinedTermSet: {
        "@type": "DefinedTermSet",
        "@id": "https://lexicon.kaganmert.com/concepts/#set",
        name: "frontier-lexicon concepts",
        url: "https://lexicon.kaganmert.com/concepts/",
      },
    });
  });
});

describe("definedTermSetJsonLd", () => {
  it("lists every concept as a member of the term set, in the given order", () => {
    const set = definedTermSetJsonLd([contextWindow, sycophancy]);
    expect(set).toMatchObject({
      "@context": "https://schema.org",
      "@type": "DefinedTermSet",
      "@id": "https://lexicon.kaganmert.com/concepts/#set",
      name: "frontier-lexicon concepts",
      url: "https://lexicon.kaganmert.com/concepts/",
    });
    expect(set.hasDefinedTerm).toEqual([
      {
        "@type": "DefinedTerm",
        "@id": "https://lexicon.kaganmert.com/concepts/context-window/#term",
        name: "Context window",
        termCode: "context-window",
        url: "https://lexicon.kaganmert.com/concepts/context-window/",
      },
      {
        "@type": "DefinedTerm",
        "@id": "https://lexicon.kaganmert.com/concepts/sycophancy/#term",
        name: "Sycophancy",
        termCode: "sycophancy",
        url: "https://lexicon.kaganmert.com/concepts/sycophancy/",
      },
    ]);
  });

  it("is a valid, empty set when there are no concepts yet", () => {
    expect(definedTermSetJsonLd([]).hasDefinedTerm).toEqual([]);
  });
});

describe("breadcrumbJsonLd", () => {
  it("walks Home → Concepts → the concept, positions starting at 1", () => {
    expect(breadcrumbJsonLd(contextWindow)).toEqual({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://lexicon.kaganmert.com/",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Concepts",
          item: "https://lexicon.kaganmert.com/concepts/",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Context window",
          item: "https://lexicon.kaganmert.com/concepts/context-window/",
        },
      ],
    });
  });
});

describe("websiteJsonLd", () => {
  it("names the site and points at its root", () => {
    expect(websiteJsonLd()).toEqual({
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": "https://lexicon.kaganmert.com/#website",
      name: "frontier-lexicon",
      url: "https://lexicon.kaganmert.com/",
      description: expect.stringContaining("map of modern AI concepts"),
      inLanguage: "en",
    });
  });
});
