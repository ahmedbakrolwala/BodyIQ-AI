import type { CatalogFood } from "../../shared/nutrition";

type Raw = CatalogFood;
const f = (
  id: string,
  name: string,
  cuisine: CatalogFood["cuisine"],
  diet: CatalogFood["dietTags"][number],
  ingredients: CatalogFood["ingredients"],
  nutrition: CatalogFood["nutrition"],
  cost: number,
  tags: string[] = [],
): Raw => ({
  id,
  name,
  cuisine,
  dietTags: [diet],
  ingredients,
  nutrition,
  estimatedCostInr: cost,
  searchableTags: [name, cuisine, diet, ...tags],
});
export const FOOD_CATALOG: CatalogFood[] = [
  f(
    "ind-dal-rice",
    "Dal rice bowl",
    "indian",
    "vegetarian",
    [
      { name: "lentils", quantity: 80, unit: "g" },
      { name: "rice", quantity: 100, unit: "g" },
      { name: "tomato", quantity: 80, unit: "g" },
    ],
    { calories: 430, proteinG: 18, carbsG: 72, fatG: 8 },
    55,
    ["dal", "lunch"],
  ),
  f(
    "ind-paneer-bowl",
    "Paneer tikka bowl",
    "indian",
    "vegetarian",
    [
      { name: "paneer", quantity: 100, unit: "g" },
      { name: "bell pepper", quantity: 80, unit: "g" },
      { name: "yogurt", quantity: 50, unit: "g" },
    ],
    { calories: 390, proteinG: 25, carbsG: 22, fatG: 22 },
    120,
    ["paneer", "dinner"],
  ),
  f(
    "ind-chana-salad",
    "Chana salad",
    "indian",
    "vegetarian",
    [
      { name: "chickpeas", quantity: 120, unit: "g" },
      { name: "cucumber", quantity: 80, unit: "g" },
      { name: "tomato", quantity: 80, unit: "g" },
    ],
    { calories: 330, proteinG: 15, carbsG: 52, fatG: 6 },
    45,
    ["chickpea", "salad"],
  ),
  f(
    "ind-veg-poha",
    "Vegetable poha",
    "indian",
    "vegetarian",
    [
      { name: "poha", quantity: 90, unit: "g" },
      { name: "peanuts", quantity: 15, unit: "g" },
      { name: "peas", quantity: 50, unit: "g" },
    ],
    { calories: 350, proteinG: 9, carbsG: 58, fatG: 10 },
    35,
    ["breakfast"],
  ),
  f(
    "ind-tofu-bhurji",
    "Tofu bhurji with roti",
    "indian",
    "vegetarian",
    [
      { name: "tofu", quantity: 150, unit: "g" },
      { name: "whole wheat roti", quantity: 2, unit: "piece" },
      { name: "onion", quantity: 50, unit: "g" },
    ],
    { calories: 410, proteinG: 24, carbsG: 48, fatG: 14 },
    70,
    ["tofu", "vegan"],
  ),
  f(
    "ind-chicken-curry",
    "Chicken curry with rice",
    "indian",
    "non_vegetarian",
    [
      { name: "chicken", quantity: 150, unit: "g" },
      { name: "rice", quantity: 100, unit: "g" },
      { name: "onion", quantity: 60, unit: "g" },
    ],
    { calories: 520, proteinG: 39, carbsG: 58, fatG: 14 },
    150,
    ["chicken"],
  ),
  f(
    "ind-egg-bhurji",
    "Egg bhurji with roti",
    "indian",
    "non_vegetarian",
    [
      { name: "eggs", quantity: 3, unit: "piece" },
      { name: "whole wheat roti", quantity: 2, unit: "piece" },
      { name: "tomato", quantity: 50, unit: "g" },
    ],
    { calories: 450, proteinG: 25, carbsG: 46, fatG: 18 },
    65,
    ["egg", "breakfast"],
  ),
  f(
    "ind-fish-thali",
    "Fish thali",
    "indian",
    "non_vegetarian",
    [
      { name: "fish", quantity: 160, unit: "g" },
      { name: "rice", quantity: 100, unit: "g" },
      { name: "lentils", quantity: 50, unit: "g" },
    ],
    { calories: 510, proteinG: 40, carbsG: 61, fatG: 11 },
    190,
    ["fish"],
  ),
  f(
    "int-oats",
    "Berry overnight oats",
    "international",
    "vegetarian",
    [
      { name: "oats", quantity: 70, unit: "g" },
      { name: "milk", quantity: 200, unit: "ml" },
      { name: "berries", quantity: 80, unit: "g" },
    ],
    { calories: 380, proteinG: 17, carbsG: 58, fatG: 10 },
    95,
    ["breakfast", "oats"],
  ),
  f(
    "int-yogurt",
    "Greek yogurt fruit bowl",
    "international",
    "vegetarian",
    [
      { name: "greek yogurt", quantity: 200, unit: "g" },
      { name: "banana", quantity: 1, unit: "piece" },
      { name: "seeds", quantity: 15, unit: "g" },
    ],
    { calories: 320, proteinG: 23, carbsG: 42, fatG: 8 },
    110,
    ["breakfast"],
  ),
  f(
    "int-bean-burrito",
    "Bean burrito",
    "international",
    "vegetarian",
    [
      { name: "beans", quantity: 120, unit: "g" },
      { name: "tortilla", quantity: 1, unit: "piece" },
      { name: "cheese", quantity: 30, unit: "g" },
    ],
    { calories: 470, proteinG: 20, carbsG: 67, fatG: 14 },
    100,
    ["mexican"],
  ),
  f(
    "int-pasta",
    "Lentil pasta primavera",
    "international",
    "vegetarian",
    [
      { name: "lentil pasta", quantity: 100, unit: "g" },
      { name: "tomato", quantity: 120, unit: "g" },
      { name: "zucchini", quantity: 80, unit: "g" },
    ],
    { calories: 440, proteinG: 24, carbsG: 70, fatG: 8 },
    130,
    ["pasta"],
  ),
  f(
    "int-chicken-salad",
    "Grilled chicken salad",
    "international",
    "non_vegetarian",
    [
      { name: "chicken", quantity: 150, unit: "g" },
      { name: "lettuce", quantity: 100, unit: "g" },
      { name: "olive oil", quantity: 10, unit: "ml" },
    ],
    { calories: 360, proteinG: 39, carbsG: 14, fatG: 16 },
    155,
    ["chicken", "salad"],
  ),
  f(
    "int-salmon",
    "Salmon quinoa plate",
    "international",
    "non_vegetarian",
    [
      { name: "salmon", quantity: 140, unit: "g" },
      { name: "quinoa", quantity: 100, unit: "g" },
      { name: "broccoli", quantity: 100, unit: "g" },
    ],
    { calories: 560, proteinG: 38, carbsG: 48, fatG: 22 },
    280,
    ["fish", "quinoa"],
  ),
  f(
    "int-turkey-wrap",
    "Turkey hummus wrap",
    "international",
    "non_vegetarian",
    [
      { name: "turkey", quantity: 120, unit: "g" },
      { name: "tortilla", quantity: 1, unit: "piece" },
      { name: "hummus", quantity: 40, unit: "g" },
    ],
    { calories: 430, proteinG: 32, carbsG: 48, fatG: 12 },
    180,
    ["wrap"],
  ),
  f(
    "int-egg-toast",
    "Egg avocado toast",
    "international",
    "non_vegetarian",
    [
      { name: "eggs", quantity: 2, unit: "piece" },
      { name: "whole grain bread", quantity: 2, unit: "slice" },
      { name: "avocado", quantity: 60, unit: "g" },
    ],
    { calories: 420, proteinG: 20, carbsG: 37, fatG: 22 },
    125,
    ["egg", "breakfast"],
  ),
  f(
    "snack-fruit",
    "Seasonal fruit",
    "indian",
    "vegetarian",
    [{ name: "seasonal fruit", quantity: 1, unit: "serving" }],
    { calories: 100, proteinG: 1, carbsG: 25, fatG: 0 },
    35,
    ["snack"],
  ),
  f(
    "snack-roasted-chana",
    "Roasted chana",
    "indian",
    "vegetarian",
    [{ name: "roasted chickpeas", quantity: 50, unit: "g" }],
    { calories: 190, proteinG: 10, carbsG: 30, fatG: 3 },
    25,
    ["snack"],
  ),
  f(
    "snack-protein",
    "Protein yogurt",
    "international",
    "vegetarian",
    [
      { name: "greek yogurt", quantity: 150, unit: "g" },
      { name: "seeds", quantity: 10, unit: "g" },
    ],
    { calories: 180, proteinG: 18, carbsG: 14, fatG: 6 },
    80,
    ["snack"],
  ),
];
export function normalized(value: string): string {
  return value.toLowerCase().trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}
export function catalogMatchesAllergies(
  food: CatalogFood,
  allergies: string[],
): boolean {
  const haystack = normalized(
    [
      food.name,
      ...food.searchableTags,
      ...food.ingredients.map((i) => i.name),
    ].join(" "),
  );
  return allergies.some((allergy) => {
    const a = normalized(allergy);
    return (
      a.length > 0 &&
      (haystack.includes(a) ||
        a
          .split(" ")
          .some((token) => token.length > 2 && haystack.includes(token)))
    );
  });
}
