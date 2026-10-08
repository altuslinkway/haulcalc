import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "@/lib/pricing/defaults";
import { withDefaults } from "./settingsStore";

/** Settings as saved before shared learning existed. */
function legacy() {
  const old: Partial<typeof DEFAULT_SETTINGS> = structuredClone(DEFAULT_SETTINGS);
  delete old.learning;
  return old as typeof DEFAULT_SETTINGS;
}

describe("saved settings", () => {
  it("fills in fields added since they were saved", () => {
    expect(withDefaults(legacy()).learning).toEqual(DEFAULT_SETTINGS.learning);
  });

  it("treats a 0% correction from before shared learning as no correction", () => {
    const old = legacy();
    old.estimate.calibrationPct = 0;
    expect(withDefaults(old).estimate.calibrationPct).toBeNull();
  });

  it("keeps a 0% correction the owner chose deliberately", () => {
    const now = structuredClone(DEFAULT_SETTINGS);
    now.estimate.calibrationPct = 0;
    expect(withDefaults(now).estimate.calibrationPct).toBe(0);
  });
});
