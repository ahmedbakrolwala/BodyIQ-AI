CREATE TABLE `authActionTokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tokenHash` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`purpose` enum('verify','reset') NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`consumedAt` timestamp,
	CONSTRAINT `authActionTokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `authActionTokens_tokenHash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `authBridgeCodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codeHash` varchar(64) NOT NULL,
	`verifierHash` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`consumedAt` timestamp,
	CONSTRAINT `authBridgeCodes_id` PRIMARY KEY(`id`),
	CONSTRAINT `authBridgeCodes_codeHash_unique` UNIQUE(`codeHash`)
);
--> statement-breakpoint
CREATE TABLE `authCredentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`passwordHash` text NOT NULL,
	`emailVerifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `authCredentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `authCredentials_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `authCredentials_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `authIdentities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`provider` varchar(32) NOT NULL,
	`subject` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `authIdentities_id` PRIMARY KEY(`id`),
	CONSTRAINT `authIdentities_provider_subject_unique` UNIQUE(`provider`,`subject`)
);
--> statement-breakpoint
CREATE TABLE `authOAuthStates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`stateHash` varchar(64) NOT NULL,
	`nonceHash` varchar(64) NOT NULL,
	`verifierHash` varchar(64) NOT NULL,
	`kind` enum('web','native') NOT NULL,
	`redirectUri` varchar(2048),
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`consumedAt` timestamp,
	CONSTRAINT `authOAuthStates_id` PRIMARY KEY(`id`),
	CONSTRAINT `authOAuthStates_stateHash_unique` UNIQUE(`stateHash`)
);
--> statement-breakpoint
CREATE TABLE `authRateLimits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`keyHash` varchar(64) NOT NULL,
	`windowStartedAt` timestamp NOT NULL,
	`count` int NOT NULL DEFAULT 0,
	`blockedUntil` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `authRateLimits_id` PRIMARY KEY(`id`),
	CONSTRAINT `authRateLimits_keyHash_unique` UNIQUE(`keyHash`)
);
--> statement-breakpoint
CREATE TABLE `authRevocations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`identityHash` varchar(64) NOT NULL,
	`revokedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `authRevocations_id` PRIMARY KEY(`id`),
	CONSTRAINT `authRevocations_identityHash_unique` UNIQUE(`identityHash`)
);
--> statement-breakpoint
CREATE TABLE `authSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sidHash` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	`reauthenticatedAt` timestamp,
	`revokedAt` timestamp,
	CONSTRAINT `authSessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `authSessions_sidHash_unique` UNIQUE(`sidHash`)
);
--> statement-breakpoint
ALTER TABLE `authActionTokens` ADD CONSTRAINT `authActionTokens_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `authBridgeCodes` ADD CONSTRAINT `authBridgeCodes_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `authCredentials` ADD CONSTRAINT `authCredentials_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `authIdentities` ADD CONSTRAINT `authIdentities_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `authSessions` ADD CONSTRAINT `authSessions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `authActionTokens_user_purpose_idx` ON `authActionTokens` (`userId`,`purpose`);--> statement-breakpoint
CREATE INDEX `authIdentities_user_idx` ON `authIdentities` (`userId`);--> statement-breakpoint
CREATE INDEX `authSessions_user_expiry_idx` ON `authSessions` (`userId`,`expiresAt`);