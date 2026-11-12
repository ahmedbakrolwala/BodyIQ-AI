CREATE TABLE `progressMeasurements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	`weightKg` double,
	`waistCm` double,
	`chestCm` double,
	`armCm` double,
	`thighCm` double,
	`note` varchar(240) NOT NULL DEFAULT '',
	`photoKey` varchar(512),
	CONSTRAINT `progressMeasurements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `progressMeasurements` ADD CONSTRAINT `progressMeasurements_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `progressMeasurements_user_recorded_idx` ON `progressMeasurements` (`userId`,`recordedAt`);