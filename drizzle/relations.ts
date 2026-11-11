import { relations } from "drizzle-orm";
import {
  authActionTokens,
  authBridgeCodes,
  authCredentials,
  authIdentities,
  authOAuthStates,
  authRateLimits,
  authRevocations,
  authSessions,
  coachConversations,
  nutritionEntries,
  progressEntries,
  userProfiles,
  users,
  workoutSessions,
  workoutPlans,
  workoutPlanExercises,
  workoutSessionExercises,
  workoutSetLogs,
} from "./schema";

export const usersRelations = relations(users, ({ many, one }) => ({
  profile: one(userProfiles),
  nutritionEntries: many(nutritionEntries),
  workoutSessions: many(workoutSessions),
  progressEntries: many(progressEntries),
  coachConversations: many(coachConversations),
  credentials: one(authCredentials),
  sessions: many(authSessions),
  actionTokens: many(authActionTokens),
  identities: many(authIdentities),
  bridgeCodes: many(authBridgeCodes),
}));

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, { fields: [userProfiles.userId], references: [users.id] }),
}));

export const nutritionEntriesRelations = relations(
  nutritionEntries,
  ({ one }) => ({
    user: one(users, {
      fields: [nutritionEntries.userId],
      references: [users.id],
    }),
  }),
);
export const workoutSessionsRelations = relations(
  workoutSessions,
  ({ one, many }) => ({
    user: one(users, {
      fields: [workoutSessions.userId],
      references: [users.id],
    }),
    plan: one(workoutPlans, {
      fields: [workoutSessions.planId],
      references: [workoutPlans.id],
    }),
    exercises: many(workoutSessionExercises),
    sets: many(workoutSetLogs),
  }),
);
export const workoutPlansRelations = relations(
  workoutPlans,
  ({ one, many }) => ({
    user: one(users, { fields: [workoutPlans.userId], references: [users.id] }),
    exercises: many(workoutPlanExercises),
    sessions: many(workoutSessions),
  }),
);
export const workoutPlanExercisesRelations = relations(
  workoutPlanExercises,
  ({ one, many }) => ({
    plan: one(workoutPlans, {
      fields: [workoutPlanExercises.planId],
      references: [workoutPlans.id],
    }),
    sessionExercises: many(workoutSessionExercises),
    sets: many(workoutSetLogs),
  }),
);
export const workoutSessionExercisesRelations = relations(
  workoutSessionExercises,
  ({ one }) => ({
    session: one(workoutSessions, {
      fields: [workoutSessionExercises.sessionId],
      references: [workoutSessions.id],
    }),
    exercise: one(workoutPlanExercises, {
      fields: [workoutSessionExercises.exerciseId],
      references: [workoutPlanExercises.id],
    }),
  }),
);
export const workoutSetLogsRelations = relations(workoutSetLogs, ({ one }) => ({
  user: one(users, { fields: [workoutSetLogs.userId], references: [users.id] }),
  session: one(workoutSessions, {
    fields: [workoutSetLogs.sessionId],
    references: [workoutSessions.id],
  }),
  exercise: one(workoutPlanExercises, {
    fields: [workoutSetLogs.exerciseId],
    references: [workoutPlanExercises.id],
  }),
}));
export const progressEntriesRelations = relations(
  progressEntries,
  ({ one }) => ({
    user: one(users, {
      fields: [progressEntries.userId],
      references: [users.id],
    }),
  }),
);
export const coachConversationsRelations = relations(
  coachConversations,
  ({ one }) => ({
    user: one(users, {
      fields: [coachConversations.userId],
      references: [users.id],
    }),
  }),
);

export const authCredentialsRelations = relations(
  authCredentials,
  ({ one }) => ({
    user: one(users, {
      fields: [authCredentials.userId],
      references: [users.id],
    }),
  }),
);
export const authSessionsRelations = relations(authSessions, ({ one }) => ({
  user: one(users, { fields: [authSessions.userId], references: [users.id] }),
}));
export const authActionTokensRelations = relations(
  authActionTokens,
  ({ one }) => ({
    user: one(users, {
      fields: [authActionTokens.userId],
      references: [users.id],
    }),
  }),
);
export const authIdentitiesRelations = relations(authIdentities, ({ one }) => ({
  user: one(users, { fields: [authIdentities.userId], references: [users.id] }),
}));
export const authBridgeCodesRelations = relations(
  authBridgeCodes,
  ({ one }) => ({
    user: one(users, {
      fields: [authBridgeCodes.userId],
      references: [users.id],
    }),
  }),
);

export const authOAuthStatesRelations = relations(authOAuthStates, () => ({}));
export const authRateLimitsRelations = relations(authRateLimits, () => ({}));
export const authRevocationsRelations = relations(authRevocations, () => ({}));
