import { relations } from "drizzle-orm";
import {
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
}));

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.id],
  }),
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
  ({ one }) => ({
    user: one(users, {
      fields: [workoutSessions.userId],
      references: [users.id],
    }),
  }),
);

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
