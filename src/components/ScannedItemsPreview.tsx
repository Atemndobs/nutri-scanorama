import React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { capitalizeFirstLetter } from "@/lib/utils";

export const ScannedItemsPreview: React.FC = () => {
  const items = useLiveQuery(async () => {
    return await db.items.limit(5).toArray();
  }, []);

  return (
    <div className="mt-6">
      {items && items.length > 0 && (
        <>
          <div className="flex justify-center items-center mb-4">
            <h2 className="text-lg font-semibold">Scanned Items</h2>
            <Link to="/items" className="text-nutri-purple hover:underline ml-2">
              &gt;
            </Link>
          </div>
          <div className="space-y-2">
            {items.map((item) => (
              <Card key={item.id} className="bg-card/50 backdrop-blur-sm hover:bg-card/60 transition-colors">
                <CardContent className="p-2">
                  <div className="flex justify-between">
                    <span>{capitalizeFirstLetter(item.name)}</span>
                    <span>€{item.price.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Link to="/items" className="text-nutri-purple hover:underline mt-2 inline-block">
            View All Items
          </Link>
        </>
      )}
    </div>
  );
};
