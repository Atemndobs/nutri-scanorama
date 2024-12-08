import React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { capitalizeFirstLetter } from "@/lib/utils";
import { categoryIcons } from "@/components/categories/categoryIcons";
import { CategoryName, defaultCategories } from "@/types/categories";

export const ScannedItemsPreview: React.FC = () => {
  const items = useLiveQuery(async () => {
    return await db.items.limit(5).toArray();
  }, []);

  const totalItems = useLiveQuery(async () => {
    return await db.items.count();
  }, []);

  return (
    <div className="mt-6">
      {items && items.length > 0 && (
        <>
          <div className="flex justify-center items-center mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Scanned Items</h2>
              <Link to="/items" className="hover:opacity-80 transition-opacity">
                <span className="bg-muted rounded-full px-2 py-0.5 text-sm">{totalItems}</span>
              </Link>
            </div>
            <Link to="/items" className="text-nutri-purple hover:underline ml-2 flex items-center">
              <span className="text-lg">&gt;</span>
            </Link>
          </div>
          <div className="space-y-2">
            {items.map((item) => {
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
          <Link to="/items" className="text-nutri-purple hover:underline mt-2 inline-block">
            View All Items
          </Link>
        </>
      )}
    </div>
  );
};
