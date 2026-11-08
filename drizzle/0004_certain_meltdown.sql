CREATE TABLE `foodLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`clientId` varchar(36) NOT NULL,
	`name` varchar(100) NOT NULL,
	`mealType` enum('breakfast','lunch','dinner','snack') NOT NULL,
	`calories` double NOT NULL,
	`proteinG` double NOT NULL,
	`carbsG` double NOT NULL,
	`fatG` double NOT NULL,
	`recordedAt` timestamp NOT NULL,
	CONSTRAINT `foodLogs_id` PRIMARY KEY(`id`),
	CONSTRAINT `foodLogs_user_client_unique` UNIQUE(`userId`,`clientId`)
);
--> statement-breakpoint
CREATE TABLE `trainingLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`clientId` varchar(36) NOT NULL,
	`name` varchar(160) NOT NULL,
	`exercisePlan` json NOT NULL,
	`startedAt` timestamp NOT NULL,
	`completedAt` timestamp,
	`activeUserId` int,
	CONSTRAINT `trainingLogs_id` PRIMARY KEY(`id`),
	CONSTRAINT `trainingLogs_user_client_unique` UNIQUE(`userId`,`clientId`),
	CONSTRAINT `trainingLogs_active_user_unique` UNIQUE(`activeUserId`)
);
--> statement-breakpoint
CREATE TABLE `weightLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`clientId` varchar(36) NOT NULL,
	`weightKg` double NOT NULL,
	`recordedAt` timestamp NOT NULL,
	CONSTRAINT `weightLogs_id` PRIMARY KEY(`id`),
	CONSTRAINT `weightLogs_user_client_unique` UNIQUE(`userId`,`clientId`)
);
--> statement-breakpoint
ALTER TABLE `foodLogs` ADD CONSTRAINT `foodLogs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `trainingLogs` ADD CONSTRAINT `trainingLogs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `trainingLogs` ADD CONSTRAINT `trainingLogs_activeUserId_users_id_fk` FOREIGN KEY (`activeUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `weightLogs` ADD CONSTRAINT `weightLogs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `foodLogs_user_recorded_idx` ON `foodLogs` (`userId`,`recordedAt`);--> statement-breakpoint
CREATE INDEX `trainingLogs_user_started_idx` ON `trainingLogs` (`userId`,`startedAt`);--> statement-breakpoint
CREATE INDEX `trainingLogs_user_completed_idx` ON `trainingLogs` (`userId`,`completedAt`);--> statement-breakpoint
CREATE INDEX `weightLogs_user_recorded_idx` ON `weightLogs` (`userId`,`recordedAt`);