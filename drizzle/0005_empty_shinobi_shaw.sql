CREATE TABLE `mealPlanGroceries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`planId` int NOT NULL,
	`ingredient` varchar(120) NOT NULL,
	`quantity` double NOT NULL,
	`unit` varchar(32) NOT NULL,
	CONSTRAINT `mealPlanGroceries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mealPlanMeals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`planId` int NOT NULL,
	`day` int NOT NULL,
	`mealType` enum('breakfast','lunch','dinner','snack') NOT NULL,
	`foodId` varchar(80) NOT NULL,
	`foodSnapshot` json NOT NULL,
	`estimatedCostInr` double NOT NULL,
	CONSTRAINT `mealPlanMeals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mealPlans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`durationDays` int NOT NULL,
	`cuisine` enum('indian','international','mixed') NOT NULL,
	`budget` enum('low','standard','flexible') NOT NULL,
	`dietaryMode` enum('profile','vegetarian','non_vegetarian') NOT NULL,
	`targetSnapshot` json NOT NULL,
	`profileSnapshot` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mealPlans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `mealPlanGroceries` ADD CONSTRAINT `mealPlanGroceries_planId_mealPlans_id_fk` FOREIGN KEY (`planId`) REFERENCES `mealPlans`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mealPlanMeals` ADD CONSTRAINT `mealPlanMeals_planId_mealPlans_id_fk` FOREIGN KEY (`planId`) REFERENCES `mealPlans`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mealPlans` ADD CONSTRAINT `mealPlans_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `mealPlanGroceries_plan_idx` ON `mealPlanGroceries` (`planId`);--> statement-breakpoint
CREATE INDEX `mealPlanMeals_plan_day_idx` ON `mealPlanMeals` (`planId`,`day`);--> statement-breakpoint
CREATE INDEX `mealPlans_user_created_idx` ON `mealPlans` (`userId`,`createdAt`);