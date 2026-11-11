import {
  index,
  int,
  json,
  double,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import type { FitnessInput } from "../shared/fitness";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const userProfiles = mysqlTable("userProfiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  displayName: varchar("displayName", { length: 60 }).notNull(),
  goal: mysqlEnum("goal", [
    "get_fitter",
    "build_strength",
    "improve_endurance",
  ]).notNull(),
  country: varchar("country", { length: 2 }).notNull().default("IN"),
  units: mysqlEnum("units", ["metric", "imperial"]).notNull().default("metric"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;

/** User-owned fitness inputs; generated plans are always derived server-side. */
export const fitnessProfiles = mysqlTable("fitnessProfiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  profile: json("profile").$type<FitnessInput>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FitnessProfile = typeof fitnessProfiles.$inferSelect;
export type InsertFitnessProfile = typeof fitnessProfiles.$inferInsert;

export const nutritionEntries = mysqlTable(
  "nutritionEntries",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [index("nutritionEntries_userId_idx").on(table.userId)],
);

export const workoutSessions = mysqlTable(
  "workoutSessions",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [index("workoutSessions_userId_idx").on(table.userId)],
);

export const progressEntries = mysqlTable(
  "progressEntries",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [index("progressEntries_userId_idx").on(table.userId)],
);

export const coachConversations = mysqlTable(
  "coachConversations",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [index("coachConversations_userId_idx").on(table.userId)],
);

/** Password credentials are separate so legacy Manus identities remain intact. */
export const authCredentials = mysqlTable(
  "authCredentials",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 320 }).notNull(),
    passwordHash: text("passwordHash").notNull(),
    emailVerifiedAt: timestamp("emailVerifiedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [uniqueIndex("authCredentials_email_unique").on(table.email)],
);

export const authSessions = mysqlTable(
  "authSessions",
  {
    id: int("id").autoincrement().primaryKey(),
    sidHash: varchar("sidHash", { length: 64 }).notNull().unique(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
    reauthenticatedAt: timestamp("reauthenticatedAt"),
    revokedAt: timestamp("revokedAt"),
  },
  (table) => [
    index("authSessions_user_expiry_idx").on(table.userId, table.expiresAt),
  ],
);

export const authActionTokens = mysqlTable(
  "authActionTokens",
  {
    id: int("id").autoincrement().primaryKey(),
    tokenHash: varchar("tokenHash", { length: 64 }).notNull().unique(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    purpose: mysqlEnum("purpose", ["verify", "reset"]).notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    consumedAt: timestamp("consumedAt"),
  },
  (table) => [
    index("authActionTokens_user_purpose_idx").on(table.userId, table.purpose),
  ],
);

export const authIdentities = mysqlTable(
  "authIdentities",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 32 }).notNull(),
    subject: varchar("subject", { length: 255 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("authIdentities_provider_subject_unique").on(
      table.provider,
      table.subject,
    ),
    index("authIdentities_user_idx").on(table.userId),
  ],
);

export const authOAuthStates = mysqlTable("authOAuthStates", {
  id: int("id").autoincrement().primaryKey(),
  stateHash: varchar("stateHash", { length: 64 }).notNull().unique(),
  nonceHash: varchar("nonceHash", { length: 64 }).notNull(),
  verifierHash: varchar("verifierHash", { length: 64 }).notNull(),
  kind: mysqlEnum("kind", ["web", "native"]).notNull(),
  redirectUri: varchar("redirectUri", { length: 2048 }),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  consumedAt: timestamp("consumedAt"),
});

export const authBridgeCodes = mysqlTable("authBridgeCodes", {
  id: int("id").autoincrement().primaryKey(),
  codeHash: varchar("codeHash", { length: 64 }).notNull().unique(),
  verifierHash: varchar("verifierHash", { length: 64 }).notNull(),
  userId: int("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  consumedAt: timestamp("consumedAt"),
});

export const authRateLimits = mysqlTable("authRateLimits", {
  id: int("id").autoincrement().primaryKey(),
  keyHash: varchar("keyHash", { length: 64 }).notNull().unique(),
  windowStartedAt: timestamp("windowStartedAt").notNull(),
  count: int("count").notNull().default(0),
  blockedUntil: timestamp("blockedUntil"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Hash-only markers prevent a deleted Manus/legacy identity from being recreated. */
export const authRevocations = mysqlTable("authRevocations", {
  id: int("id").autoincrement().primaryKey(),
  identityHash: varchar("identityHash", { length: 64 }).notNull().unique(),
  revokedAt: timestamp("revokedAt").defaultNow().notNull(),
});

export type NutritionEntry = typeof nutritionEntries.$inferSelect;
export type WorkoutSession = typeof workoutSessions.$inferSelect;
export type ProgressEntry = typeof progressEntries.$inferSelect;
export type CoachConversation = typeof coachConversations.$inferSelect;
export type AuthCredential = typeof authCredentials.$inferSelect;
export type AuthSession = typeof authSessions.$inferSelect;
export type AuthActionToken = typeof authActionTokens.$inferSelect;
export type AuthIdentity = typeof authIdentities.$inferSelect;
export type AuthOAuthState = typeof authOAuthStates.$inferSelect;
export type AuthBridgeCode = typeof authBridgeCodes.$inferSelect;
export type AuthRateLimit = typeof authRateLimits.$inferSelect;

/** User-owned nutrition events. clientId is an offline-safe idempotency key. */
export const foodLogs = mysqlTable(
  "foodLogs",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clientId: varchar("clientId", { length: 36 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    mealType: mysqlEnum("mealType", [
      "breakfast",
      "lunch",
      "dinner",
      "snack",
    ]).notNull(),
    calories: double("calories").notNull(),
    proteinG: double("proteinG").notNull(),
    carbsG: double("carbsG").notNull(),
    fatG: double("fatG").notNull(),
    recordedAt: timestamp("recordedAt").notNull(),
  },
  (table) => [
    uniqueIndex("foodLogs_user_client_unique").on(table.userId, table.clientId),
    index("foodLogs_user_recorded_idx").on(table.userId, table.recordedAt),
  ],
);

export type FoodLog = typeof foodLogs.$inferSelect;
export type InsertFoodLog = typeof foodLogs.$inferInsert;

/** Saved-plan workout snapshots. A non-null activeUserId marks the one active workout. */
export const trainingLogs = mysqlTable(
  "trainingLogs",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clientId: varchar("clientId", { length: 36 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    exercisePlan: json("exercisePlan").notNull(),
    startedAt: timestamp("startedAt").notNull(),
    completedAt: timestamp("completedAt"),
    activeUserId: int("activeUserId").references(() => users.id, {
      onDelete: "cascade",
    }),
  },
  (table) => [
    uniqueIndex("trainingLogs_user_client_unique").on(
      table.userId,
      table.clientId,
    ),
    uniqueIndex("trainingLogs_active_user_unique").on(table.activeUserId),
    index("trainingLogs_user_started_idx").on(table.userId, table.startedAt),
    index("trainingLogs_user_completed_idx").on(
      table.userId,
      table.completedAt,
    ),
  ],
);

export type TrainingLog = typeof trainingLogs.$inferSelect;
export type InsertTrainingLog = typeof trainingLogs.$inferInsert;

/** User-owned body-weight events, retained even when no fitness profile exists. */
export const weightLogs = mysqlTable(
  "weightLogs",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clientId: varchar("clientId", { length: 36 }).notNull(),
    weightKg: double("weightKg").notNull(),
    recordedAt: timestamp("recordedAt").notNull(),
  },
  (table) => [
    uniqueIndex("weightLogs_user_client_unique").on(
      table.userId,
      table.clientId,
    ),
    index("weightLogs_user_recorded_idx").on(table.userId, table.recordedAt),
  ],
);

export type WeightLog = typeof weightLogs.$inferSelect;
export type InsertWeightLog = typeof weightLogs.$inferInsert;
/** Server-generated, user-owned nutrition plan snapshots. */
export const mealPlans = mysqlTable(
  "mealPlans",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    durationDays: int("durationDays").notNull(),
    cuisine: mysqlEnum("cuisine", [
      "indian",
      "international",
      "mixed",
    ]).notNull(),
    budget: mysqlEnum("budget", ["low", "standard", "flexible"]).notNull(),
    dietaryMode: mysqlEnum("dietaryMode", [
      "profile",
      "vegetarian",
      "non_vegetarian",
    ]).notNull(),
    targetSnapshot: json("targetSnapshot").notNull(),
    profileSnapshot: json("profileSnapshot").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("mealPlans_user_created_idx").on(table.userId, table.createdAt),
  ],
);
export const mealPlanMeals = mysqlTable(
  "mealPlanMeals",
  {
    id: int("id").autoincrement().primaryKey(),
    planId: int("planId")
      .notNull()
      .references(() => mealPlans.id, { onDelete: "cascade" }),
    day: int("day").notNull(),
    mealType: mysqlEnum("mealType", [
      "breakfast",
      "lunch",
      "dinner",
      "snack",
    ]).notNull(),
    foodId: varchar("foodId", { length: 80 }).notNull(),
    foodSnapshot: json("foodSnapshot").notNull(),
    estimatedCostInr: double("estimatedCostInr").notNull(),
  },
  (table) => [index("mealPlanMeals_plan_day_idx").on(table.planId, table.day)],
);
export const mealPlanGroceries = mysqlTable(
  "mealPlanGroceries",
  {
    id: int("id").autoincrement().primaryKey(),
    planId: int("planId")
      .notNull()
      .references(() => mealPlans.id, { onDelete: "cascade" }),
    ingredient: varchar("ingredient", { length: 120 }).notNull(),
    quantity: double("quantity").notNull(),
    unit: varchar("unit", { length: 32 }).notNull(),
  },
  (table) => [index("mealPlanGroceries_plan_idx").on(table.planId)],
);
export type MealPlan = typeof mealPlans.$inferSelect;
export type MealPlanMeal = typeof mealPlanMeals.$inferSelect;
export type MealPlanGrocery = typeof mealPlanGroceries.$inferSelect;
