import { Grid, ShoppingCart, Coffee, Home, Cookie } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

export const TopCategories = () => {
  const categories = useLiveQuery(() => db.categories.toArray());

  const categoryIcons = {
    Groceries: ShoppingCart,
    Beverages: Coffee,
    Snacks: Cookie,
    Household: Home,
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      {categories?.slice(0, 4).map((category) => {
        const Icon = categoryIcons[category.name as keyof typeof categoryIcons] || Grid;
        
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