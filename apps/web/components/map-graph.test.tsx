import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { mapFixture } from "../lib/map-fixture";
import { layoutMap } from "../lib/map-layout";
import { MapGraph, MapLegend } from "./map-graph";

const html = renderToStaticMarkup(<MapGraph layout={layoutMap(mapFixture)} />);
const count = (needle: string) => html.split(needle).length - 1;

describe("MapGraph", () => {
  it("links published nodes only, with the trailing slash", () => {
    expect(count("<a data-node")).toBe(1);
    expect(count("data-node=")).toBe(3);
    expect(html).toContain('<a data-node="token" href="/concepts/token/">');
  });

  it("is a labelled group sized to the fixed-unit geometry", () => {
    expect(html).toMatch(
      /^<svg role="group" aria-label="Concept map" viewBox="0 0 416 1248" width="416" height="1248"/,
    );
  });

  it("labels all ten layer bands", () => {
    expect(html).toContain(">Layer 1: Model fundamentals</text>");
    expect(html).toContain(">Layer 10: Research vocabulary</text>");
  });

  it("truncates long titles on the node and keeps the full one in <title>", () => {
    expect(html).toContain(">Model Context Proto…</text>");
    expect(html).toContain(
      "<title>Model Context Protocol (MCP): not published yet</title>",
    );
  });

  it("gives every linked node visible text and every draft a <title>", () => {
    expect(html).toMatch(
      /<a data-node="token" href="\/concepts\/token\/"><title>Token<\/title><rect[^>]*><\/rect><text[^>]*>Token<\/text><\/a>/,
    );
    expect(count(": not published yet</title>")).toBe(2);
  });

  it("draws edges before nodes: prerequisites solid with an arrowhead, the rest dashed and titled", () => {
    expect(html.indexOf('<path d="M129.8 102L194.2 186"')).toBeGreaterThan(-1);
    expect(html.indexOf('<path d="M')).toBeLessThan(html.indexOf("data-node"));
    expect(html).toMatch(
      /<path d="M129.8 102L194.2 186"[^>]*marker-end="url\(#map-arrow\)"/,
    );
    expect(html).toMatch(
      /<path d="M156 102C156 118 260 118 260 102"[^>]*stroke-dasharray="[^"]+"[^>]*><title>Token related to Model Context Protocol \(MCP\)<\/title><\/path>/,
    );
  });
});

describe("MapLegend", () => {
  it("explains the two edge styles and the draft style", () => {
    const legend = renderToStaticMarkup(<MapLegend />);
    expect(legend).toContain("Prerequisite");
    expect(legend).toContain("Measures, mitigates, causes or related to");
    expect(legend).toContain("Not published yet");
  });
});
