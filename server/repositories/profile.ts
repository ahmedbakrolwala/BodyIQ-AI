import { eq, sql } from "drizzle-orm";
import type { UserProfile } from "../../drizzle/schema";
import { fitnessProfiles, userProfiles, users } from "../../drizzle/schema";
import type { ProfileSaveInput } from "../../shared/profile";
import { getDb } from "../db";

async function requireDb() {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not configured or reachable");
  }
  return db;
}

export async function getProfileByUserId(
  userId: number,
): Promise<UserProfile | null> {
  const db = await requireDb();
  const rows = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertProfile(
  userId: number,
  input: ProfileSaveInput,
): Promise<UserProfile> {
  const db = await requireDb();
  const values = {
    userId,
    displayName: input.displayName,
    goal: input.goal,
    country: input.country,
    units: input.units,
  };

  await db.transaction(async (tx) => {
    const updatedAt = new Date();
    // Use the required owner row as the common lock with fitness saves and
    // weight logging; a user can exist before either profile row does.
    await tx.execute(
      sql`SELECT id FROM ${users} WHERE id = ${userId} FOR UPDATE`,
    );
    await tx
      .insert(userProfiles)
      .values(values)
      .onDuplicateKeyUpdate({
        set: {
          displayName: input.displayName,
          goal: input.goal,
          country: input.country,
          units: input.units,
          updatedAt,
        },
      });

    // Keep the two editors convergent without changing the legacy three-value
    // goal column. This UPDATE is a no-op when no fitness row exists.
    await tx
      .update(fitnessProfiles)
      .set({
        profile: sql`JSON_SET(${fitnessProfiles.profile}, '$.units', ${input.units})`,
        updatedAt,
      })
      .where(eq(fitnessProfiles.userId, userId));
  });

  const saved = await getProfileByUserId(userId);
  if (!saved) {
    throw new Error(
      "Profile upsert completed but the profile could not be read",
    );
  }
  return saved;
}
