import { describe, expect, it } from "vitest";
import { learn, type FeedbackLine, type FeedbackRecord } from "./learn";

const sectional = (cubicYards: number, id = "a"): FeedbackLine => ({ id, category: "sectional", quantity: 1, cubicYards, weightLbs: 250 });
const pile = (cubicYards: number, id = "p"): FeedbackLine => ({ id, category: "mixed_pile", quantity: 1, cubicYards, weightLbs: 200 * cubicYards });

let n = 0;
function record(deviceId: string, o: Partial<FeedbackRecord> = {}): FeedbackRecord {
  return {
    id: `job-${n++}`,
    deviceId,
    scope: "single_area",
    confidence: "medium",
    trailerCubicYards: 15,
    aiLines: [sectional(3.5)],
    sentLines: null,
    outcome: null,
    ...o,
  };
}

describe("learn: item corrections", () => {
  it("learns nothing until enough different owners agree", () => {
    const sameOwner = [1, 2, 3, 4, 5].map(() => record("one", { sentLines: [sectional(4.5)] }));
    expect(learn(sameOwner).items).toEqual([]);
  });

  it("learns how far owners move the AI, and the size they settle on", () => {
    const model = learn([
      record("a", { sentLines: [sectional(4.2)] }), // +20%
      record("b", { sentLines: [sectional(4.55)] }), // +30%
      record("c", { sentLines: [sectional(3.5)] }), // accepted as is
      record("d", { sentLines: [sectional(4.2)] }), // +20%
    ]);
    expect(model.items).toEqual([
      { category: "sectional", perUnitCubicYards: 4.2, biasPct: 20, owners: 4, observations: 4 },
    ]);
  });

  it("gives each owner one vote, however many jobs they send", () => {
    const flood = Array.from({ length: 50 }, () => record("spammer", { sentLines: [sectional(17.5)] })); // ×5
    const honest = ["a", "b", "c"].map((d) => record(d, { sentLines: [sectional(3.5)] }));
    expect(learn([...flood, ...honest]).items[0]).toMatchObject({ biasPct: 0, owners: 4 });
  });

  it("ignores lines added by the owner and implausible edits", () => {
    const model = learn(
      ["a", "b", "c"].map((d) => record(d, { sentLines: [sectional(3.5), sectional(100, "added")] })),
    );
    expect(model.items[0]).toMatchObject({ biasPct: 0, perUnitCubicYards: 3.5, observations: 3 });
  });

  it("learns a size bias for piles, but no per-piece size", () => {
    const model = learn(
      ["a", "b", "c"].map((d) => record(d, { aiLines: [pile(2)], sentLines: [pile(2.5)] })),
    );
    expect(model.items[0]).toMatchObject({ category: "mixed_pile", perUnitCubicYards: null, biasPct: 25 });
  });
});

describe("learn: finished jobs", () => {
  it("learns a whole-job correction by kind of job, from actual sizes or one-tap ratings", () => {
    const model = learn([
      record("a", { outcome: { won: true, rating: null, actualCubicYards: 4.2, dumpWeightLbs: 840 } }), // 1.2
      record("b", { outcome: { won: true, rating: "bigger", actualCubicYards: null, dumpWeightLbs: null } }), // 1.15
      record("c", { outcome: { won: true, rating: "much_bigger", actualCubicYards: null, dumpWeightLbs: null } }), // 1.3
      record("d", { outcome: { won: false, rating: null, actualCubicYards: null, dumpWeightLbs: null } }),
    ]);
    expect(model.scopeCalibration.single_area).toEqual({ pct: 20, jobs: 3, owners: 3 });
    expect(model.scopeCalibration.multi_area).toBeUndefined();
    expect(model.lbsPerCubicYard).toBeNull(); // only one owner weighed a load
    expect(model).toMatchObject({ jobs: 4, owners: 4 });
  });

  it("reads a rating against the quote the owner saw, so a correction doesn't undo itself", () => {
    // The AI said 3.5; the quote already carried a +20% correction; owners say "about right".
    const model = learn(
      ["a", "b", "c"].map((d) =>
        record(d, {
          sentLines: [sectional(3.5)],
          calibrationPct: 20,
          outcome: { won: true, rating: "about_right", actualCubicYards: null, dumpWeightLbs: null },
        }),
      ),
    );
    expect(model.scopeCalibration.single_area?.pct).toBe(20);
  });

  it("uses each owner's latest jobs, so the correction follows the AI as it improves", () => {
    const rated = (d: string, rating: "about_right" | "much_bigger") =>
      record(d, { outcome: { won: true, rating, actualCubicYards: null, dumpWeightLbs: null } });
    // Newest first: each owner's last 10 jobs came in about right; older ones ran much bigger.
    const records = ["a", "b", "c"].flatMap((d) => [
      ...Array.from({ length: 10 }, () => rated(d, "about_right")),
      ...Array.from({ length: 15 }, () => rated(d, "much_bigger")),
    ]);
    expect(learn(records).scopeCalibration.single_area).toMatchObject({ pct: 0, jobs: 30 });
  });

  it("learns dump-ticket density once enough owners weigh loads", () => {
    const model = learn(
      ["a", "b", "c"].map((d, i) =>
        record(d, { outcome: { won: true, rating: null, actualCubicYards: 10, dumpWeightLbs: 2000 + i * 100 } }),
      ),
    );
    expect(model.lbsPerCubicYard).toEqual({ value: 210, owners: 3 });
  });
});
