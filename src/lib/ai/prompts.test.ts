import { describe, expect, it } from "vitest";
import { EMPTY_MODEL } from "@/lib/learning/learn";
import { learnedGuidance, PHOTO_ANALYSIS_SYSTEM } from "./prompts";

describe("photo prompt", () => {
  it("lists every item type in the reference guide", () => {
    expect(PHOTO_ANALYSIS_SYSTEM).toContain("- sectional: Sectional sofa, 3–4 yd³ each, ~250 lbs");
    expect(PHOTO_ANALYSIS_SYSTEM).toContain("- dense: Concrete, dirt, brick or rock, by volume, ~2000 lbs per yd³");
  });

  it("adds nothing until something has been learned", () => {
    expect(learnedGuidance(EMPTY_MODEL)).toBe("");
    expect(learnedGuidance(undefined)).toBe("");
  });

  it("passes on learned sizes and pile corrections, skipping items the AI already gets right", () => {
    const text = learnedGuidance({
      ...EMPTY_MODEL,
      items: [
        { category: "sectional", perUnitCubicYards: 4.2, biasPct: 20, owners: 5, observations: 12 },
        { category: "mixed_pile", perUnitCubicYards: null, biasPct: 15, owners: 4, observations: 9 },
        { category: "boxes", perUnitCubicYards: null, biasPct: 2, owners: 3, observations: 3 },
      ],
    });
    expect(text).toContain("- sectional: about 4.2 yd³ each (confirmed by 5 owners)");
    expect(text).toContain("- mixed_pile: has run about 15% bigger than estimated from photos (4 owners)");
    expect(text).not.toContain("boxes");
  });
});
