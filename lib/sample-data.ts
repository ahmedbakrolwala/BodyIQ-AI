/** Design-only examples. Never pass these records to private API mutations. */
export const sampleDay = {
  displayName: "Alex",
  calories: 1680,
  calorieGoal: 2200,
  protein: { value: 112, goal: 140 },
  carbs: { value: 184, goal: 260 },
  fats: { value: 54, goal: 70 },
  water: 1750,
  waterGoal: 2500,
  steps: 6840,
  stepGoal: 10000,
  activeKcal: 420,
  activeGoal: 600,
  trainingMinutes: 35,
  trainingGoal: 45,
};
export const sampleMeals = [
  {
    id: "breakfast",
    title: "Breakfast",
    food: "Oats, banana & Greek yogurt",
    calories: 420,
    time: "8:30 AM",
    icon: "sunrise",
  },
  {
    id: "lunch",
    title: "Lunch",
    food: "Grilled chicken & rice bowl",
    calories: 560,
    time: "1:15 PM",
    icon: "sun",
  },
  {
    id: "dinner",
    title: "Dinner",
    food: "Paneer, roti & mixed vegetables",
    calories: 520,
    time: "7:30 PM",
    icon: "moon",
  },
  {
    id: "snack",
    title: "Snack",
    food: "Apple & a handful of almonds",
    calories: 180,
    time: "4:00 PM",
    icon: "coffee",
  },
] as const;
export const sampleWorkouts = [
  {
    id: "strength",
    title: "Full body strength",
    category: "Strength",
    duration: 35,
    exercises: 6,
    level: "Intermediate",
    icon: "activity",
    color: "#C3FF5C",
    description:
      "A sample training layout with squat, hinge, push, pull, and core exercise slots. This preview is not a personalized exercise prescription.",
  },
  {
    id: "cardio",
    title: "Find your second wind",
    category: "Cardio",
    duration: 25,
    exercises: 4,
    level: "All levels",
    icon: "wind",
    color: "#82B9DD",
    description:
      "A sample interval-cardio layout with warm-up, steady movement, interval, and cooldown slots. No session is started or recorded.",
  },
  {
    id: "mobility",
    title: "Reset & recover",
    category: "Mobility",
    duration: 15,
    exercises: 5,
    level: "All levels",
    icon: "sun",
    color: "#B6A1EF",
    description:
      "A sample recovery layout demonstrating how mobility sessions could appear. It is not medical or individualized recovery advice.",
  },
] as const;
export const sampleTrends = {
  Weight: {
    Week: {
      values: [78.9, 78.8, 78.9, 78.7, 78.6, 78.5, 78.4],
      labels: ["M", "T", "W", "T", "F", "S", "S"],
      min: 78,
      max: 80,
    },
    Month: {
      values: [80.2, 79.6, 79.1, 78.4],
      labels: ["W1", "W2", "W3", "W4"],
      min: 78,
      max: 81,
    },
    Year: {
      values: [83, 82.5, 81.9, 81.2, 80, 78.4],
      labels: ["Jan", "Mar", "May", "Jul", "Sep", "Nov"],
      min: 77,
      max: 84,
    },
  },
  Activity: {
    Week: {
      values: [1, 0, 1, 1, 0, 1, 0],
      labels: ["M", "T", "W", "T", "F", "S", "S"],
      min: 0,
      max: 2,
    },
    Month: {
      values: [3, 4, 3, 4],
      labels: ["W1", "W2", "W3", "W4"],
      min: 0,
      max: 5,
    },
    Year: {
      values: [8, 9, 10, 12, 11, 14],
      labels: ["Jan", "Mar", "May", "Jul", "Sep", "Nov"],
      min: 0,
      max: 16,
    },
  },
};
export const sampleMealImage =
  "/manus-storage/async-images/0YmiapfX26HG83Ea8WjUoD/image-1.webp";
