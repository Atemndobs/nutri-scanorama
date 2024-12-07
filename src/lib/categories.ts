import React from "react";
import { Grid, Coffee, Cookie, Apple, Carrot, Milk, Beef, Croissant, Wheat, Candy, Droplets } from "lucide-react";
import type { CategoryName } from "@/types/categories";

export const categoryIcons: Record<CategoryName, React.ComponentType> = {
  Beverages: Coffee,
  Snacks: Cookie,
  Fruits: Apple,
  Vegetables: Carrot,
  Dairy: Milk,
  Meat: Beef,
  Bakery: Croissant,
  Cereals: Wheat,
  Sweets: Candy,
  Oils: Droplets,
  Other: Grid
};
