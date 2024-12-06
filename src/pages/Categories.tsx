import React from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { categoryIcons } from "@/components/categories/categoryIcons";
import type { CategoryName } from "@/types/categories";
import { Grid } from "lucide-react";

export const Categories = () => {
  // Query all categories with their item counts
  const categories = useLiveQuery(async () => {
    console.debug('[Categories] Querying categories');
    const result = await db.categories.toArray();
    console.debug('[Categories] Found categories:', result);
    return result;
  });

  // Calculate total items for percentage
  const totalItems = categories?.reduce((sum, cat) => sum + (cat.itemCount || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Food Categories</h1>
      
      <div className="grid grid-cols-2 gap-4">
        {categories?.map((category) => {
          const Icon = categoryIcons[category.name as CategoryName] || Grid;
          const percentage = totalItems > 0 ? ((category.itemCount || 0) / totalItems) * 100 : 0;
          
          return (
            <Card 
              key={category.name} 
              className="hover:bg-accent/50 transition-colors"
              style={{ borderColor: category.color }}
            >
              <CardHeader className="pb-2 space-y-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  {Icon && <Icon className="w-4 h-4" style={{ color: category.color }} />}
                  <span className="truncate" style={{ color: category.color }}>{category.name}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{category.itemCount || 0} items</span>
                    <span className="text-muted-foreground">{percentage.toFixed(1)}%</span>
                  </div>
                  <Progress value={percentage} className="h-2" style={{ 
                    '--progress-background': category.color + '40',
                    '--progress-foreground': category.color 
                  } as React.CSSProperties} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(!categories || categories.length === 0) && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No categories found. Start by scanning some receipts!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Categories;
