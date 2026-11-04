import { describe, expect, it } from "vitest";
import { conceptFrontMatter } from "./concept-schema";

const valid = {
  title: "Context window",
  description: "The maximum number of tokens a model can read in one request.",
  layer: 2,
  track: "shared",
  status: "published",
};

describe("conceptFrontMatter", () => {
  it("accepts the minimal contract and passes unknown fields through", () => {
    const result = conceptFrontMatter.safeParse({
      ...valid,
      question: "Why do long chats degrade?",
    });
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      question: "Why do long chats degrade?",
    });
  });

  it("rejects a multi-line title or description", () => {
    expect(
      conceptFrontMatter.safeParse({ ...valid, title: "Context\nwindow" })
        .success,
    ).toBe(false);
    expect(
      conceptFrontMatter.safeParse({ ...valid, description: "Line one.\nTwo." })
        .success,
    ).toBe(false);
  });

  it("rejects a slug that is not lowercase kebab-case", () => {
    expect(
      conceptFrontMatter.safeParse({ ...valid, slug: "Context Window" })
        .success,
    ).toBe(false);
    expect(
      conceptFrontMatter.safeParse({ ...valid, slug: "context-window" })
        .success,
    ).toBe(true);
  });

  it("requires status to be draft or published", () => {
    const withoutStatus: Partial<typeof valid> = { ...valid };
    delete withoutStatus.status;
    expect(conceptFrontMatter.safeParse(withoutStatus).success).toBe(false);
    expect(
      conceptFrontMatter.safeParse({ ...valid, status: "review" }).success,
    ).toBe(false);
    expect(
      conceptFrontMatter.safeParse({ ...valid, status: "draft" }).success,
    ).toBe(true);
  });

  it("rejects a layer outside 1–10 and an unknown track", () => {
    expect(conceptFrontMatter.safeParse({ ...valid, layer: 11 }).success).toBe(
      false,
    );
    expect(
      conceptFrontMatter.safeParse({ ...valid, track: "ops" }).success,
    ).toBe(false);
  });
});
