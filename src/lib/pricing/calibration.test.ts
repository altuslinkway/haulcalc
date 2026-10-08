import { describe, expect, it } from "vitest";
import { formatFraction, parseFraction } from "@/lib/format";
import { calibrate } from "./calibration";

describe("calibrate", () => {
  it("waits for a few jobs before suggesting a correction", () => {
    const c = calibrate([{ aiLoadCubicYards: 5, actualLoadCubicYards: 6, dumpWeightLbs: null }]);
    expect(c.jobs).toBe(1);
    expect(c.suggestedPct).toBeNull();
  });

  it("suggests the median correction, ignoring jobs without results", () => {
    const c = calibrate([
      { aiLoadCubicYards: 5, actualLoadCubicYards: 6, dumpWeightLbs: 1200 }, // +20%
      { aiLoadCubicYards: 10, actualLoadCubicYards: 11, dumpWeightLbs: null }, // +10%
      { aiLoadCubicYards: 4, actualLoadCubicYards: 8, dumpWeightLbs: null }, // +100%, an outlier
      { aiLoadCubicYards: 3, actualLoadCubicYards: null, dumpWeightLbs: null },
    ]);
    expect(c.jobs).toBe(3);
    expect(c.suggestedPct).toBe(20);
    expect(c.lbsPerCubicYard).toBe(200);
    expect(c.weighedJobs).toBe(1);
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
