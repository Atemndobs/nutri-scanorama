import React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { capitalizeFirstLetter } from "@/lib/utils";

const ScannedItemsPage: React.FC = () => {
  const items = useLiveQuery(async () => {
    return await db.items.toArray();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-lg font-semibold mb-4">All Scanned Items</h2>
      <div className="space-y-4">
        {items?.map((item) => (
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
    </div>
  );
};

export default ScannedItemsPage;
