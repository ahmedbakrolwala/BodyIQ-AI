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

export const nutritionEntriesRelations = relations(nutritionEntries, ({ one }) => ({
  user: one(users, { fields: [nutritionEntries.userId], references: [users.id] }),
}));
export const workoutSessionsRelations = relations(workoutSessions, ({ one }) => ({
  user: one(users, { fields: [workoutSessions.userId], references: [users.id] }),
}));
export const progressEntriesRelations = relations(progressEntries, ({ one }) => ({
  user: one(users, { fields: [progressEntries.userId], references: [users.id] }),
}));
export const coachConversationsRelations = relations(coachConversations, ({ one }) => ({
  user: one(users, { fields: [coachConversations.userId], references: [users.id] }),
}));

export const authCredentialsRelations = relations(authCredentials, ({ one }) => ({
  user: one(users, { fields: [authCredentials.userId], references: [users.id] }),
}));
export const authSessionsRelations = relations(authSessions, ({ one }) => ({
  user: one(users, { fields: [authSessions.userId], references: [users.id] }),
}));
export const authActionTokensRelations = relations(authActionTokens, ({ one }) => ({
  user: one(users, { fields: [authActionTokens.userId], references: [users.id] }),
}));
export const authIdentitiesRelations = relations(authIdentities, ({ one }) => ({
  user: one(users, { fields: [authIdentities.userId], references: [users.id] }),
}));
export const authBridgeCodesRelations = relations(authBridgeCodes, ({ one }) => ({
  user: one(users, { fields: [authBridgeCodes.userId], references: [users.id] }),
}));

export const authOAuthStatesRelations = relations(authOAuthStates, () => ({}));
export const authRateLimitsRelations = relations(authRateLimits, () => ({}));
export const authRevocationsRelations = relations(authRevocations, () => ({}));
