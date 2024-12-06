import { Grid } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Progress } from "./ui/progress";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useState, useEffect } from "react";
import type { CategoryName } from "@/types/categories";
import { categoryIcons } from "./categories/categoryIcons";
import { CategoryItemsDialog } from "./CategoryItemsDialog";

export const TopCategories = () => {
  const [needsRecalculation, setNeedsRecalculation] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<{ name: CategoryName; color: string } | null>(null);

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
    <>
      <div className="grid grid-cols-2 gap-4">
        {categories.slice(0, 4).map((category) => {
          const Icon = categoryIcons[category.name] || Grid;
          const percentage = (category.itemCount / categories.reduce((sum, cat) => sum + cat.itemCount, 0)) * 100;
          
          return (
            <Card 
              key={category.name} 
              className="flex items-center p-4 gap-4 cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => setSelectedCategory({ name: category.name, color: category.color })}
            >
              {Icon && (
                <div className="shrink-0 flex flex-col items-center gap-1">
                  <Icon className="w-4 h-4" style={{ color: category.color }} />
                  <span className="text-xs text-muted-foreground">{category.itemCount}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium truncate" style={{ color: category.color }}>
                    {category.name}
                  </h3>
                  <span className="text-sm text-muted-foreground">
                    {percentage > 0 ? `${percentage.toFixed(1)}%` : ''}
                  </span>
                </div>
                <Progress value={percentage} className="h-2" style={{ 
                  '--progress-background': category.color + '40',
                  '--progress-foreground': category.color 
                } as React.CSSProperties} />
              </div>
            </Card>
          );
        })}
      </div>

      {selectedCategory && (
        <CategoryItemsDialog
          category={selectedCategory.name}
          color={selectedCategory.color}
          isOpen={!!selectedCategory}
          onClose={() => setSelectedCategory(null)}
        />
      )}
    </>
  );
};