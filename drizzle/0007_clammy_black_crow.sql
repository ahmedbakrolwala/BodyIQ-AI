CREATE TABLE `coachMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coachMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `coachMessages` ADD CONSTRAINT `coachMessages_conversationId_coachConversations_id_fk` FOREIGN KEY (`conversationId`) REFERENCES `coachConversations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coachMessages` ADD CONSTRAINT `coachMessages_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `coachMessages_user_created_idx` ON `coachMessages` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `coachMessages_conversation_created_idx` ON `coachMessages` (`conversationId`,`createdAt`);