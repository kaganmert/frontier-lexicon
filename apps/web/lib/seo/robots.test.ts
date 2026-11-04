import { describe, expect, it } from "vitest";
import { aiCrawlers, robotsConfig } from "./robots";

describe("robotsConfig", () => {
  it("allows everyone everywhere and points at the sitemap", () => {
    const robots = robotsConfig();
    expect(robots.rules).toContainEqual({ userAgent: "*", allow: "/" });
    expect(robots.sitemap).toBe("https://lexicon.kaganmert.com/sitemap.xml");
  });

  it("explicitly allows the known AI crawlers", () => {
    expect(aiCrawlers).toEqual([
      "GPTBot",
      "OAI-SearchBot",
      "ClaudeBot",
      "Claude-SearchBot",
      "Google-Extended",
      "PerplexityBot",
      "CCBot",
    ]);
    expect(robotsConfig().rules).toContainEqual({
      userAgent: aiCrawlers,
      allow: "/",
    });
  });

  it("never disallows anything", () => {
    const rules = Array.isArray(robotsConfig().rules)
      ? robotsConfig().rules
      : [robotsConfig().rules];
    for (const rule of rules as Array<{ disallow?: unknown }>) {
      expect(rule.disallow).toBeUndefined();
    }
  });
});
