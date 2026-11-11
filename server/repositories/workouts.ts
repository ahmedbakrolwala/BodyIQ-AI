import { and, asc, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  workoutPlans,
  workoutPlanExercises,
  workoutSessions,
  workoutSessionExercises,
  workoutSetLogs,
} from "../../drizzle/schema";
import {
  deriveEstimatedRecord,
  type WorkoutSelection,
} from "../../shared/workouts";
import { buildWorkoutSnapshot } from "../services/workout-catalog";

async function requireDb() {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database unavailable",
    });
  return db;
}
function notFound(message: string): never {
  throw new TRPCError({ code: "NOT_FOUND", message });
}
function assertOwned<T extends { userId: number }>(
  row: T | undefined,
  userId: number,
  message: string,
): T {
  if (!row || row.userId !== userId) notFound(message);
  return row;
}

export async function generatePlan(
  userId: number,
  selection: WorkoutSelection,
) {
  const db = await requireDb();
  const exercises = buildWorkoutSnapshot(selection);
  if (!exercises.length)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "No exercises match this location, equipment, goal, and muscle selection",
    });
  const title = `${selection.goal.replaceAll("_", " ")} · ${selection.split.replaceAll("_", " ")}`;
  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(workoutPlans)
      .values({ userId, selection, title });
    const planId = Number(inserted[0].insertId);
    await tx.insert(workoutPlanExercises).values(
      exercises.map((exercise) => ({
        planId,
        catalogKey: exercise.key,
        order: exercise.order,
        snapshot: exercise,
      })),
    );
    return getPlan(userId, planId, tx);
  });
}

export async function getPlan(userId: number, planId: number, executor?: any) {
  const db = executor ?? (await requireDb());
  const plans = await db
    .select()
    .from(workoutPlans)
    .where(and(eq(workoutPlans.id, planId), eq(workoutPlans.userId, userId)))
    .limit(1);
  if (!plans[0]) notFound("Workout plan not found");
  const exercises = await db
    .select()
    .from(workoutPlanExercises)
    .where(eq(workoutPlanExercises.planId, planId))
    .orderBy(asc(workoutPlanExercises.order));
  return { ...plans[0], exercises };
}

export async function startSession(
  userId: number,
  planId: number,
  clientId: string,
) {
  const db = await requireDb();
  const plan = await getPlan(userId, planId, db);
  const existing = await db
    .select()
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.userId, userId),
        eq(workoutSessions.clientId, clientId),
      ),
    )
    .limit(1);
  if (existing[0]) return existing[0];
  const active = await db
    .select()
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.userId, userId),
        eq(workoutSessions.status, "active"),
      ),
    )
    .orderBy(desc(workoutSessions.startedAt))
    .limit(1);
  if (active[0]) return active[0];
  return db.transaction(async (tx) => {
    const inserted = await tx.insert(workoutSessions).values({
      userId,
      planId,
      clientId,
      status: "active",
      startedAt: new Date(),
    });
    const sessionId = Number(inserted[0].insertId);
    await tx.insert(workoutSessionExercises).values(
      plan.exercises.map((e: any) => ({
        sessionId,
        exerciseId: e.id,
        skipped: 0,
      })),
    );
    const rows = await tx
      .select()
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.id, sessionId),
          eq(workoutSessions.userId, userId),
        ),
      )
      .limit(1);
    return rows[0];
  });
}

async function ownedSession(userId: number, sessionId: number) {
  const db = await requireDb();
  const rows = await db
    .select()
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.id, sessionId),
        eq(workoutSessions.userId, userId),
      ),
    )
    .limit(1);
  return assertOwned(rows[0], userId, "Workout session not found");
}

export async function logSet(
  userId: number,
  input: {
    sessionId: number;
    exerciseId: number;
    setNumber: number;
    reps: number;
    weightKg: number;
    clientId: string;
  },
) {
  const db = await requireDb();
  const session = await ownedSession(userId, input.sessionId);
  if (session.status !== "active")
    throw new TRPCError({
      code: "CONFLICT",
      message: "Completed sessions cannot be changed",
    });
  const existing = await db
    .select()
    .from(workoutSetLogs)
    .where(
      and(
        eq(workoutSetLogs.userId, userId),
        eq(workoutSetLogs.clientId, input.clientId),
      ),
    )
    .limit(1);
  if (existing[0]) return existing[0];
  const membership = await db
    .select()
    .from(workoutSessionExercises)
    .where(
      and(
        eq(workoutSessionExercises.sessionId, input.sessionId),
        eq(workoutSessionExercises.exerciseId, input.exerciseId),
      ),
    )
    .limit(1);
  if (!membership[0]) notFound("Exercise is not part of this session");
  const inserted = await db.insert(workoutSetLogs).values({ ...input, userId });
  const rows = await db
    .select()
    .from(workoutSetLogs)
    .where(eq(workoutSetLogs.id, Number(inserted[0].insertId)))
    .limit(1);
  return rows[0];
}

export async function replaceExercise(
  userId: number,
  sessionId: number,
  exerciseId: number,
  replacementExerciseId: number,
) {
  const db = await requireDb();
  const session = await ownedSession(userId, sessionId);
  if (session.status !== "active")
    throw new TRPCError({
      code: "CONFLICT",
      message: "Completed sessions cannot be changed",
    });
  const membership = await db
    .select()
    .from(workoutSessionExercises)
    .where(
      and(
        eq(workoutSessionExercises.sessionId, sessionId),
        eq(workoutSessionExercises.exerciseId, exerciseId),
      ),
    )
    .limit(1);
  if (!membership[0]) notFound("Exercise is not part of this session");
  const replacement = await db
    .select()
    .from(workoutPlanExercises)
    .where(
      and(
        eq(workoutPlanExercises.id, replacementExerciseId),
        eq(workoutPlanExercises.planId, session.planId!),
      ),
    )
    .limit(1);
  if (!replacement[0]) notFound("Replacement exercise not found");
  await db
    .update(workoutSessionExercises)
    .set({ replacementExerciseId })
    .where(
      and(
        eq(workoutSessionExercises.sessionId, sessionId),
        eq(workoutSessionExercises.exerciseId, exerciseId),
      ),
    );
  return { replaced: true, replacementExerciseId } as const;
}
export async function skipExercise(
  userId: number,
  sessionId: number,
  exerciseId: number,
) {
  const db = await requireDb();
  await ownedSession(userId, sessionId);
  await db
    .update(workoutSessionExercises)
    .set({ skipped: 1 })
    .where(
      and(
        eq(workoutSessionExercises.sessionId, sessionId),
        eq(workoutSessionExercises.exerciseId, exerciseId),
      ),
    );
  return { skipped: true } as const;
}
export async function completeSession(userId: number, sessionId: number) {
  const db = await requireDb();
  const session = await ownedSession(userId, sessionId);
  if (session.status === "completed") return session;
  await db
    .update(workoutSessions)
    .set({ status: "completed", completedAt: new Date() })
    .where(
      and(
        eq(workoutSessions.id, sessionId),
        eq(workoutSessions.userId, userId),
        eq(workoutSessions.status, "active"),
      ),
    );
  const rows = await db
    .select()
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.id, sessionId),
        eq(workoutSessions.userId, userId),
      ),
    )
    .limit(1);
  return rows[0];
}
export async function history(userId: number, limit = 20) {
  const db = await requireDb();
  return db
    .select()
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.userId, userId),
        eq(workoutSessions.status, "completed"),
      ),
    )
    .orderBy(desc(workoutSessions.completedAt))
    .limit(limit);
}
export async function records(userId: number) {
  const db = await requireDb();
  const rows = await db
    .select({ log: workoutSetLogs, exercise: workoutPlanExercises })
    .from(workoutSetLogs)
    .innerJoin(
      workoutSessions,
      eq(workoutSessions.id, workoutSetLogs.sessionId),
    )
    .innerJoin(
      workoutPlanExercises,
      eq(workoutPlanExercises.id, workoutSetLogs.exerciseId),
    )
    .where(
      and(
        eq(workoutSetLogs.userId, userId),
        eq(workoutSessions.status, "completed"),
      ),
    );
  const best = new Map<
    number,
    {
      exerciseId: number;
      exerciseName: string;
      estimatedOneRepMaxKg: number;
      bestWeightKg: number;
      reps: number;
      label: "estimated";
    }
  >();
  for (const row of rows) {
    const score = deriveEstimatedRecord(row.log.weightKg, row.log.reps);
    const prior = best.get(row.log.exerciseId);
    if (!prior || score > prior.estimatedOneRepMaxKg)
      best.set(row.log.exerciseId, {
        exerciseId: row.log.exerciseId,
        exerciseName: row.exercise.snapshot.name,
        estimatedOneRepMaxKg: score,
        bestWeightKg: row.log.weightKg,
        reps: row.log.reps,
        label: "estimated",
      });
  }
  return [...best.values()];
}
