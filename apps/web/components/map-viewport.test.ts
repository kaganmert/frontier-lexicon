import { describe, expect, it } from "vitest";
import { wheelZoomFactor } from "./map-viewport";

const PIXEL = 0;
const LINE = 1;
const PAGE = 2;

describe("wheelZoomFactor", () => {
  it("zooms smoothly on the small pixel deltas of a trackpad pinch", () => {
    expect(wheelZoomFactor(-10, PIXEL, 600)).toBeCloseTo(Math.exp(0.1));
  });

  it("caps a mouse wheel tick at one button step", () => {
    expect(wheelZoomFactor(100, PIXEL, 600)).toBe(0.8);
    expect(wheelZoomFactor(-100, PIXEL, 600)).toBe(1.25);
  });

  it("reads line deltas (Firefox) as lines, not pixels", () => {
    // One wheel tick in Firefox: 3 lines.
    expect(wheelZoomFactor(3, LINE, 600)).toBe(0.8);
    expect(wheelZoomFactor(-3, LINE, 600)).toBe(1.25);
  });

  it("reads page deltas as pages", () => {
    expect(wheelZoomFactor(1, PAGE, 600)).toBe(0.8);
  });
});
