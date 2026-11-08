import {
  int,
  index,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
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

/** The user-owned Phase 1 profile. There is at most one row per authenticated user. */
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

/** Future nutrition ownership boundary; no Phase 1 endpoints are exposed. */
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

/** Future workout ownership boundary; no Phase 1 endpoints are exposed. */
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

/** Future progress ownership boundary; no Phase 1 endpoints are exposed. */
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

/** Future coach conversation ownership boundary; no Phase 1 endpoints are exposed. */
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

export type NutritionEntry = typeof nutritionEntries.$inferSelect;
export type WorkoutSession = typeof workoutSessions.$inferSelect;
export type ProgressEntry = typeof progressEntries.$inferSelect;
export type CoachConversation = typeof coachConversations.$inferSelect;
