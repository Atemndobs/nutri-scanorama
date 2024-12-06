import React from "react";
import { Grid, ShoppingCart, Coffee, Home, Cookie, Apple, Carrot, Milk, Beef, Croissant, Bath } from "lucide-react";
import type { CategoryName } from "@/types/categories";

export const categoryIcons: Record<CategoryName, React.ComponentType> = {
  Groceries: ShoppingCart,
  Beverages: Coffee,
  Snacks: Cookie,
  Household: Home,
  Fruits: Apple,
  Vegetables: Carrot,
  Dairy: Milk,
  Meat: Beef,
  Bakery: Croissant,
  "Personal Care": Bath,
  Sweets: Cookie,
  Other: Grid
};
