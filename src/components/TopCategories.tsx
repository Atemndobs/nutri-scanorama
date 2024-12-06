import { Grid, ShoppingCart, Coffee, Home, Cookie, Apple, Carrot, Milk, Beef, Croissant, Bath, Candy } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useState, useEffect } from "react";
import type { CategoryName } from "@/types/categories";

const categoryIcons: Record<CategoryName, React.ComponentType> = {
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
  Other: Grid,
  Sweets: Candy,
};

export const TopCategories = () => {
  const [needsRecalculation, setNeedsRecalculation] = useState(false);

  // Effect to handle recalculation
  useEffect(() => {
    if (needsRecalculation) {
      console.debug('[TopCategories] Triggering recalculation');
      db.recalculateCategoryCounts().then(() => {
        setNeedsRecalculation(false);
        console.debug('[TopCategories] Recalculation complete');
      });
    }
  }, [needsRecalculation]);

  const categories = useLiveQuery(async () => {
    console.debug('[TopCategories] Starting categories query');
    
    // Get total items count for verification
    const totalItems = await db.items.count();
    console.debug('[TopCategories] Total items in database:', totalItems);
    
    const allCategories = await db.categories.toArray();
    const totalCategoryCount = allCategories.reduce((sum, cat) => sum + cat.itemCount, 0);
    console.debug('[TopCategories] Total items across categories:', totalCategoryCount);
    
    // If counts don't match, trigger recalculation
    if (totalItems !== totalCategoryCount && !needsRecalculation) {
      console.debug('[TopCategories] Count mismatch detected, will trigger recalculation');
      setNeedsRecalculation(true);
    }
    
    return allCategories.sort((a, b) => b.itemCount - a.itemCount);
  }, [needsRecalculation]);

  if (!categories) return null;

  return (
    <div className="grid grid-cols-2 gap-4">
      {categories.slice(0, 4).map((category) => {
        const Icon = categoryIcons[category.name] || Grid;
        
        return (
          <Card key={category.id} className="bg-card/50 backdrop-blur-sm hover:bg-card/60 transition-colors">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <div className="h-12 w-12 rounded-full bg-nutri-purple/10 flex items-center justify-center mb-3">
                <Icon className="h-6 w-6 text-nutri-purple" />
              </div>
              <h3 className="font-medium text-sm mb-1">{category.name}</h3>
              <p className="text-xs text-muted-foreground">
                {category.itemCount} items
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};