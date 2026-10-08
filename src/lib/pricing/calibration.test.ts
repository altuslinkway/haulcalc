import { describe, expect, it } from "vitest";
import { formatFraction, parseFraction } from "@/lib/format";
import { calibrate, jobRatio } from "./calibration";

describe("calibrate", () => {
  it("waits for a few jobs before suggesting a correction", () => {
    const c = calibrate([{ aiCubicYards: 5, quotedCubicYards: 5, calibrationPct: 0, actualCubicYards: 6, rating: null, dumpWeightLbs: null }]);
    expect(c.jobs).toBe(1);
    expect(c.suggestedPct).toBeNull();
  });

  it("suggests the median correction from exact sizes or one-tap ratings", () => {
    const c = calibrate([
      { aiCubicYards: 5, quotedCubicYards: 5, calibrationPct: 0, actualCubicYards: 6, rating: null, dumpWeightLbs: 1200 }, // +20%
      { aiCubicYards: 10, quotedCubicYards: 10, calibrationPct: 0, actualCubicYards: null, rating: "bigger", dumpWeightLbs: null }, // +15%
      { aiCubicYards: 4, quotedCubicYards: 4, calibrationPct: 0, actualCubicYards: 8, rating: null, dumpWeightLbs: null }, // +100%, an outlier
      { aiCubicYards: 3, quotedCubicYards: 3, calibrationPct: 0, actualCubicYards: null, rating: null, dumpWeightLbs: null },
    ]);
    expect(c.jobs).toBe(3);
    expect(c.suggestedPct).toBe(20);
    expect(c.lbsPerCubicYard).toBe(200);
    expect(c.weighedJobs).toBe(1);
  });

  it("prefers an exact size over a rating", () => {
    expect(
      jobRatio({ aiCubicYards: 10, quotedCubicYards: 10, calibrationPct: 0, actualCubicYards: 9, rating: "much_bigger", dumpWeightLbs: null }),
    ).toBe(0.9);
  });

  it("reads a rating against the quote the owner saw", () => {
    // AI said 5; the owner quoted on 6 with a +10% correction; it came in "about right".
    expect(
      jobRatio({ aiCubicYards: 5, quotedCubicYards: 6, calibrationPct: 10, actualCubicYards: null, rating: "about_right", dumpWeightLbs: null }),
    ).toBeCloseTo(1.32);
  });
});

describe("fractions", () => {
  it("reads the ways owners write load sizes", () => {
    expect(parseFraction("1/4")).toBe(0.25);
    expect(parseFraction("1 1/2")).toBe(1.5);
    expect(parseFraction("60%")).toBe(0.6);
    expect(parseFraction("full")).toBe(1);
    expect(parseFraction("0.5")).toBe(0.5);
    expect(parseFraction("abc")).toBeNull();
  });

  it("writes common fractions back out", () => {
    expect(formatFraction(0.375)).toBe("3/8");
    expect(formatFraction(0.6)).toBe("60%");
  });
});
