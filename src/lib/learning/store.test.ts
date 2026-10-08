import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";
import type { FeedbackRecord } from "./learn";
import { createFileStore, createPostgresStore, type FeedbackStore } from "./store";

const sent: Omit<FeedbackRecord, "id" | "deviceId"> = {
  scope: "single_area",
  confidence: "medium",
  trailerCubicYards: 15,
  aiLines: [{ id: "a", category: "sofa", quantity: 1, cubicYards: 2, weightLbs: 150 }],
  sentLines: [{ id: "a", category: "sofa", quantity: 1, cubicYards: 2.5, weightLbs: 150 }],
  outcome: null,
};
const outcome = { outcome: { won: true, rating: "bigger" as const, actualCubicYards: null, dumpWeightLbs: null } };

function behavesLikeAStore(name: string, make: () => Promise<FeedbackStore>) {
  // The in-process Postgres takes a few seconds to boot the first time.
  describe(name, { timeout: 30_000 }, () => {
    it("saves a sent quote and merges its outcome later", async () => {
      const store = await make();
      await store.upsert("job-1", "dev-1", sent);
      await store.upsert("job-1", "dev-1", outcome);
      const [r] = await store.recent();
      expect(r).toMatchObject({ id: "job-1", deviceId: "dev-1", scope: "single_area", outcome: outcome.outcome });
      expect(r.sentLines?.[0].cubicYards).toBe(2.5);
    });

    it("won't let another device change someone else's job", async () => {
      const store = await make();
      await store.upsert("job-1", "dev-1", sent);
      await store.upsert("job-1", "dev-2", { ...sent, scope: "multi_area" });
      const [r] = await store.recent();
      expect(r).toMatchObject({ deviceId: "dev-1", scope: "single_area" });
    });

    it("skips records that never got their quote half", async () => {
      const store = await make();
      await store.upsert("orphan", "dev-1", outcome);
      expect(await store.recent()).toEqual([]);
    });
  });
}

behavesLikeAStore("Postgres store", async () => {
  const pg = new PGlite();
  return createPostgresStore({
    query: async (text, params) => {
      // PGlite runs one statement per query() call; the schema has two.
      if (!params) {
        await pg.exec(text);
        return [];
      }
      return (await pg.query<Record<string, unknown>>(text, params)).rows;
    },
  });
});

behavesLikeAStore("File store", async () => {
  const dir = await mkdtemp(join(tmpdir(), "haulcalc-"));
  return createFileStore(join(dir, "feedback.json"));
});
