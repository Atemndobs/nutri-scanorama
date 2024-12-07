import { Grid, Coffee, Cookie, Apple, Carrot, Milk, Beef, Croissant, LucideIcon, Wheat, Candy, Droplets } from "lucide-react";
import type { CategoryName } from "@/types/categories";

export const categoryIcons: Record<CategoryName, LucideIcon> = {
  Fruits: Apple,
  Vegetables: Carrot,
  Dairy: Milk,
  Meat: Beef,
  Bakery: Croissant,
  Beverages: Coffee,
  Snacks: Cookie,
  Cereals: Wheat,
  Sweets: Candy,
  Oils: Droplets,
  Other: Grid
};
