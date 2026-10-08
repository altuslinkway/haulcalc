import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { FeedbackRecord } from "./learn";

// Where pooled feedback lives. Postgres in production (any provider that
// gives a DATABASE_URL: Vercel/Neon, Supabase, RDS); a JSON file for local
// development. Records are merged, so a job's outcome can arrive days after
// its quote, and only the device that created a record can change it.

export interface FeedbackStore {
  upsert(id: string, deviceId: string, data: Partial<FeedbackRecord>): Promise<void>;
  /** Recent complete records, newest first. */
  recent(days?: number, limit?: number): Promise<FeedbackRecord[]>;
}

/** The slice of a Postgres client the store needs, so tests can run it on an in-process Postgres. */
export interface Db {
  query(text: string, params?: unknown[]): Promise<Record<string, unknown>[]>;
}

const SCHEMA = `
  create table if not exists haulcalc_feedback (
    id text primary key,
    device_id text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    data jsonb not null
  );
  create index if not exists haulcalc_feedback_updated_at on haulcalc_feedback (updated_at desc);
`;

const isComplete = (r: Partial<FeedbackRecord>): r is FeedbackRecord => Array.isArray(r.aiLines) && typeof r.scope === "string";

export function createPostgresStore(db: Db): FeedbackStore {
  let ready: Promise<unknown> | null = null;
  const init = () => (ready ??= db.query(SCHEMA));

  return {
    async upsert(id, deviceId, data) {
      await init();
      await db.query(
        `insert into haulcalc_feedback (id, device_id, data) values ($1, $2, $3::jsonb)
         on conflict (id) do update set data = haulcalc_feedback.data || excluded.data, updated_at = now()
         where haulcalc_feedback.device_id = excluded.device_id`,
        [id, deviceId, JSON.stringify(data)],
      );
    },
    async recent(days = 180, limit = 20000) {
      await init();
      const rows = await db.query(
        `select id, device_id, data from haulcalc_feedback
         where updated_at > now() - make_interval(days => $1::int)
         order by updated_at desc limit $2::int`,
        [days, limit],
      );
      return rows
        .map((row) => {
          const data = (typeof row.data === "string" ? JSON.parse(row.data) : row.data) as Partial<FeedbackRecord>;
          return { ...data, id: String(row.id), deviceId: String(row.device_id) };
        })
        .filter(isComplete);
    },
  };
}

interface FileRow {
  deviceId: string;
  updatedAt: number;
  data: Partial<FeedbackRecord>;
}

/** For local development only: a JSON file standing in for the database. */
export function createFileStore(path: string): FeedbackStore {
  const load = async (): Promise<Record<string, FileRow>> => {
    try {
      return JSON.parse(await readFile(path, "utf8"));
    } catch {
      return {};
    }
  };

  return {
    async upsert(id, deviceId, data) {
      const rows = await load();
      const existing = rows[id];
      if (existing && existing.deviceId !== deviceId) return;
      rows[id] = { deviceId, updatedAt: Date.now(), data: { ...existing?.data, ...data } };
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, JSON.stringify(rows));
    },
    async recent(days = 180, limit = 20000) {
      const since = Date.now() - days * 86_400_000;
      return Object.entries(await load())
        .filter(([, row]) => row.updatedAt > since)
        .sort(([, a], [, b]) => b.updatedAt - a.updatedAt)
        .slice(0, limit)
        .map(([id, row]) => ({ ...row.data, id, deviceId: row.deviceId }))
        .filter(isComplete);
    },
  };
}
