import { and, desc, eq, gte } from "drizzle-orm";
import {
  fitnessProfiles,
  progressMeasurements,
  trainingLogs,
  workoutSetLogs,
} from "../../drizzle/schema";
import {
  progressInputSchema,
  type ProgressInput,
  type ProgressRecord,
  type ProgressSummary,
} from "../../shared/progress";
import { storageGetSignedUrl, storagePut } from "../storage";
import { getDb } from "../db";

async function dbOrThrow() {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured or reachable");
  return db;
}
function record(
  row: typeof progressMeasurements.$inferSelect,
  photoUrl: string | null,
): ProgressRecord {
  return {
    id: row.id,
    recordedAt: row.recordedAt.toISOString(),
    weightKg: row.weightKg === null ? null : Number(row.weightKg),
    waistCm: row.waistCm === null ? null : Number(row.waistCm),
    chestCm: row.chestCm === null ? null : Number(row.chestCm),
    armCm: row.armCm === null ? null : Number(row.armCm),
    thighCm: row.thighCm === null ? null : Number(row.thighCm),
    note: row.note,
    photoUrl,
  };
}
async function withPhoto(row: typeof progressMeasurements.$inferSelect) {
  return record(
    row,
    row.photoKey ? await storageGetSignedUrl(row.photoKey) : null,
  );
}
export async function list(
  userId: number,
  period: "week" | "month" | "all" = "all",
  limit = 100,
): Promise<ProgressSummary> {
  const db = await dbOrThrow();
  const now = Date.now();
  const start =
    period === "week"
      ? new Date(now - 7 * 86400000)
      : period === "month"
        ? new Date(now - 30 * 86400000)
        : new Date(0);
  const [rows, weeks, months, fitness, strength] = await Promise.all([
    db
      .select()
      .from(progressMeasurements)
      .where(
        and(
          eq(progressMeasurements.userId, userId),
          gte(progressMeasurements.recordedAt, start),
        ),
      )
      .orderBy(desc(progressMeasurements.recordedAt))
      .limit(Math.min(limit, 100)),
    db
      .select()
      .from(trainingLogs)
      .where(
        and(
          eq(trainingLogs.userId, userId),
          gte(trainingLogs.completedAt!, new Date(now - 7 * 86400000)),
        ),
      ),
    db
      .select()
      .from(trainingLogs)
      .where(
        and(
          eq(trainingLogs.userId, userId),
          gte(trainingLogs.completedAt!, new Date(now - 30 * 86400000)),
        ),
      ),
    db
      .select()
      .from(fitnessProfiles)
      .where(eq(fitnessProfiles.userId, userId))
      .limit(1),
    db
      .select({ weightKg: workoutSetLogs.weightKg })
      .from(workoutSetLogs)
      .where(eq(workoutSetLogs.userId, userId))
      .orderBy(desc(workoutSetLogs.weightKg))
      .limit(1),
  ]);
  const records = await Promise.all(rows.reverse().map(withPhoto));
  const series = (key: keyof ProgressRecord) =>
    records.flatMap((r) =>
      typeof r[key] === "number"
        ? [{ date: r.recordedAt.slice(0, 10), value: r[key] as number }]
        : [],
    );
  let goalCompletion: number | null = null;
  if (fitness[0]) {
    const profile = fitness[0].profile as any;
    const weights = records.flatMap((r) =>
      r.weightKg === null ? [] : [r.weightKg],
    );
    const latest = weights.at(-1);
    if (profile.targetWeightKg && latest) {
      const initial = weights[0] ?? profile.weightKg;
      const total = Math.abs(initial - profile.targetWeightKg);
      goalCompletion = total
        ? Math.max(
            0,
            Math.min(
              100,
              Math.round(
                (1 - Math.abs(latest - profile.targetWeightKg) / total) * 100,
              ),
            ),
          )
        : 100;
    }
  }
  const milestones: string[] = [];
  if (records.length) milestones.push("First progress record");
  if (weeks.length >= 3) milestones.push("Three workouts this week");
  if (strength[0])
    milestones.push(
      `Personal strength best: ${Number(strength[0].weightKg).toFixed(1)} kg`,
    );
  return {
    records,
    charts: {
      weight: series("weightKg"),
      waist: series("waistCm"),
      chest: series("chestCm"),
      arm: series("armCm"),
      thigh: series("thighCm"),
    },
    weekly: { workouts: weeks.length, goalCompletion },
    monthly: { workouts: months.length, goalCompletion },
    strength: {
      bestWeightKg: strength[0] ? Number(strength[0].weightKg) : null,
      records: strength.length,
    },
    milestones,
  };
}
export async function create(
  userId: number,
  input: ProgressInput,
): Promise<ProgressRecord> {
  const db = await dbOrThrow();
  const parsed = progressInputSchema.parse(input);
  let photoKey: string | undefined;
  if (parsed.photo) {
    const bytes = Buffer.from(parsed.photo.imageBase64, "base64");
    if (bytes.length > 5 * 1024 * 1024)
      throw new Error("Progress photo exceeds 5 MB");
    photoKey = (
      await storagePut(
        `users/${userId}/progress/${crypto.randomUUID()}`,
        bytes,
        parsed.photo.mimeType,
      )
    ).key;
  }
  const inserted = await db
    .insert(progressMeasurements)
    .values({
      userId,
      recordedAt: parsed.recordedAt ? new Date(parsed.recordedAt) : new Date(),
      weightKg: parsed.weightKg,
      waistCm: parsed.waistCm,
      chestCm: parsed.chestCm,
      armCm: parsed.armCm,
      thighCm: parsed.thighCm,
      note: parsed.note,
      photoKey,
    })
    .$returningId();
  const rows = await db
    .select()
    .from(progressMeasurements)
    .where(eq(progressMeasurements.id, inserted[0].id))
    .limit(1);
  if (!rows[0]) throw new Error("Progress record could not be read");
  return withPhoto(rows[0]);
}
export async function update(userId: number, id: number, input: ProgressInput) {
  const db = await dbOrThrow();
  const parsed = progressInputSchema.parse(input);
  const existing = await db
    .select()
    .from(progressMeasurements)
    .where(
      and(
        eq(progressMeasurements.id, id),
        eq(progressMeasurements.userId, userId),
      ),
    )
    .limit(1);
  if (!existing[0]) throw new Error("Progress record not found");
  let photoKey = existing[0].photoKey ?? undefined;
  if (parsed.photo) {
    photoKey = (
      await storagePut(
        `users/${userId}/progress/${crypto.randomUUID()}`,
        Buffer.from(parsed.photo.imageBase64, "base64"),
        parsed.photo.mimeType,
      )
    ).key;
  }
  await db
    .update(progressMeasurements)
    .set({
      recordedAt: parsed.recordedAt
        ? new Date(parsed.recordedAt)
        : existing[0].recordedAt,
      weightKg: parsed.weightKg,
      waistCm: parsed.waistCm,
      chestCm: parsed.chestCm,
      armCm: parsed.armCm,
      thighCm: parsed.thighCm,
      note: parsed.note,
      photoKey,
    })
    .where(
      and(
        eq(progressMeasurements.id, id),
        eq(progressMeasurements.userId, userId),
      ),
    );
  const rows = await db
    .select()
    .from(progressMeasurements)
    .where(eq(progressMeasurements.id, id))
    .limit(1);
  if (!rows[0]) throw new Error("Progress record could not be read");
  return withPhoto(rows[0]);
}
export async function remove(userId: number, id: number) {
  const db = await dbOrThrow();
  await db
    .delete(progressMeasurements)
    .where(
      and(
        eq(progressMeasurements.id, id),
        eq(progressMeasurements.userId, userId),
      ),
    );
  return { success: true as const };
}
