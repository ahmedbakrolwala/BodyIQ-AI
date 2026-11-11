ALTER TABLE `workoutSessions` ADD `planId` int;
--> statement-breakpoint
ALTER TABLE `workoutSessions` ADD `clientId` varchar(36);
--> statement-breakpoint
ALTER TABLE `workoutSessions` ADD `status` enum('active','completed') NOT NULL DEFAULT 'active';
--> statement-breakpoint
ALTER TABLE `workoutSessions` ADD `startedAt` timestamp;
--> statement-breakpoint
ALTER TABLE `workoutSessions` ADD `completedAt` timestamp;
--> statement-breakpoint
CREATE TABLE `workoutPlans` (`id` int AUTO_INCREMENT NOT NULL, `userId` int NOT NULL, `selection` json NOT NULL, `title` varchar(160) NOT NULL, `createdAt` timestamp NOT NULL DEFAULT (now()), CONSTRAINT `workoutPlans_id` PRIMARY KEY(`id`));
--> statement-breakpoint
CREATE TABLE `workoutPlanExercises` (`id` int AUTO_INCREMENT NOT NULL, `planId` int NOT NULL, `catalogKey` varchar(80) NOT NULL, `order` int NOT NULL, `snapshot` json NOT NULL, CONSTRAINT `workoutPlanExercises_id` PRIMARY KEY(`id`));
--> statement-breakpoint
CREATE TABLE `workoutSessionExercises` (`id` int AUTO_INCREMENT NOT NULL, `sessionId` int NOT NULL, `exerciseId` int NOT NULL, `skipped` int NOT NULL DEFAULT 0, `replacementExerciseId` int, CONSTRAINT `workoutSessionExercises_id` PRIMARY KEY(`id`));
--> statement-breakpoint
CREATE TABLE `workoutSetLogs` (`id` int AUTO_INCREMENT NOT NULL, `userId` int NOT NULL, `sessionId` int NOT NULL, `exerciseId` int NOT NULL, `setNumber` int NOT NULL, `reps` int NOT NULL, `weightKg` double NOT NULL, `clientId` varchar(36) NOT NULL, `loggedAt` timestamp NOT NULL DEFAULT (now()), CONSTRAINT `workoutSetLogs_id` PRIMARY KEY(`id`));
--> statement-breakpoint
ALTER TABLE `workoutPlans` ADD CONSTRAINT `workoutPlans_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `workoutPlanExercises` ADD CONSTRAINT `workoutPlanExercises_planId_workoutPlans_id_fk` FOREIGN KEY (`planId`) REFERENCES `workoutPlans`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `workoutSessionExercises` ADD CONSTRAINT `workoutSessionExercises_sessionId_workoutSessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `workoutSessions`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `workoutSessionExercises` ADD CONSTRAINT `workoutSessionExercises_exerciseId_workoutPlanExercises_id_fk` FOREIGN KEY (`exerciseId`) REFERENCES `workoutPlanExercises`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `workoutSetLogs` ADD CONSTRAINT `workoutSetLogs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `workoutSetLogs` ADD CONSTRAINT `workoutSetLogs_sessionId_workoutSessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `workoutSessions`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `workoutSetLogs` ADD CONSTRAINT `workoutSetLogs_exerciseId_workoutPlanExercises_id_fk` FOREIGN KEY (`exerciseId`) REFERENCES `workoutPlanExercises`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX `workoutSessions_user_client_unique` ON `workoutSessions` (`userId`,`clientId`);
--> statement-breakpoint
CREATE INDEX `workoutSessions_user_status_idx` ON `workoutSessions` (`userId`,`status`);
--> statement-breakpoint
CREATE INDEX `workoutPlans_user_created_idx` ON `workoutPlans` (`userId`,`createdAt`);
--> statement-breakpoint
CREATE INDEX `workoutPlanExercises_plan_order_idx` ON `workoutPlanExercises` (`planId`,`order`);
--> statement-breakpoint
CREATE UNIQUE INDEX `workoutPlanExercises_plan_key_unique` ON `workoutPlanExercises` (`planId`,`catalogKey`);
--> statement-breakpoint
CREATE UNIQUE INDEX `workoutSessionExercises_session_exercise_unique` ON `workoutSessionExercises` (`sessionId`,`exerciseId`);
--> statement-breakpoint
CREATE INDEX `workoutSessionExercises_session_idx` ON `workoutSessionExercises` (`sessionId`);
--> statement-breakpoint
CREATE UNIQUE INDEX `workoutSetLogs_user_client_unique` ON `workoutSetLogs` (`userId`,`clientId`);
--> statement-breakpoint
CREATE INDEX `workoutSetLogs_user_session_idx` ON `workoutSetLogs` (`userId`,`sessionId`);
--> statement-breakpoint
CREATE INDEX `workoutSetLogs_user_exercise_idx` ON `workoutSetLogs` (`userId`,`exerciseId`);
