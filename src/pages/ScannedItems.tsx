import React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { capitalizeFirstLetter } from "@/lib/utils";
import { categoryIcons } from "@/components/categories/categoryIcons";
import { CategoryName, defaultCategories } from "@/types/categories";

const ScannedItemsPage: React.FC = () => {
  const items = useLiveQuery(async () => {
    return await db.items.toArray();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-lg font-semibold mb-4">All Scanned Items</h2>
      <div className="space-y-4">
        {items?.map((item) => {
          const Icon = categoryIcons[item.category as CategoryName || 'Other'];
          return (
            <Card key={item.id} className="bg-card/50 backdrop-blur-sm hover:bg-card/60 transition-colors">
              <CardContent className="p-2">
                <div className="flex justify-between items-center">
                  <span>{capitalizeFirstLetter(item.name)}</span>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {Icon && (
                        <Icon 
                          className="h-4 w-4" 
                          style={{ 
                            color: defaultCategories[item.category as CategoryName || 'Other'].color 
                          }} 
                        />
                      )}
                      <span className="text-sm text-muted-foreground">
                        {capitalizeFirstLetter(item.category || 'Other')}
                      </span>
                    </div>
                    <span>€{item.price.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ScannedItemsPage;
