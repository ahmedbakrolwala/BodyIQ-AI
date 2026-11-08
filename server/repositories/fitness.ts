import { eq } from "drizzle-orm";
import { fitnessProfiles, userProfiles } from "../../drizzle/schema";
import type { FitnessInput, FitnessPlan } from "../../shared/fitness";
import { fitnessInputSchema } from "../../shared/fitness";
import { deriveFitnessPlan } from "../../shared/fitness-planning";
import { getDb } from "../db";

async function requireDb() {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not configured or reachable");
  }
  return db;
}

async function getFitnessProfileRowByUserId(userId: number) {
  const db = await requireDb();
  const rows = await db
    .select()
    .from(fitnessProfiles)
    .where(eq(fitnessProfiles.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getFitnessPlanByUserId(
  userId: number,
): Promise<FitnessPlan | null> {
  const row = await getFitnessProfileRowByUserId(userId);
  if (!row) return null;

  // Parse stored JSON as a defense against malformed legacy/manual records.
  const profile = fitnessInputSchema.parse(row.profile);
  return deriveFitnessPlan(profile);
}

export async function upsertFitnessProfile(
  userId: number,
  input: FitnessInput,
): Promise<FitnessPlan> {
  const db = await requireDb();
  const profile = fitnessInputSchema.parse(input);

  await db.transaction(async (tx) => {
    const updatedAt = new Date();

    // Both profile editors update the basic row before the fitness row. This
    // gives concurrent edits a consistent lock order and avoids unit drift.
    await tx
      .update(userProfiles)
      .set({ units: profile.units, updatedAt })
      .where(eq(userProfiles.userId, userId));

    await tx
      .insert(fitnessProfiles)
      .values({ userId, profile })
      .onDuplicateKeyUpdate({
        set: {
          profile,
          updatedAt,
        },
      });
  });

  const saved = await getFitnessPlanByUserId(userId);
  if (!saved) {
    throw new Error(
      "Fitness profile upsert completed but it could not be read",
    );
  }
  return saved;
}

// Explicit aliases make the repository easy to consume from focused tests and
// leave room for future callers without exposing a client-controlled owner ID.
export const getFitnessByUserId = getFitnessPlanByUserId;
export const saveFitnessProfile = upsertFitnessProfile;
