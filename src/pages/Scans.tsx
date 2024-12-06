import React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt as ReceiptIcon, ShoppingBag } from "lucide-react";
import { Calendar, ShoppingCart, Flame, CheckCircle, Loader } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ScansPage: React.FC = () => {
  const navigate = useNavigate();

  const receipts = useLiveQuery(async () => {
    const allReceipts = await db.receipts.toArray();
    const receiptsWithItems = await Promise.all(
      allReceipts.map(async (receipt) => {
        const items = await db.items.where('receiptId').equals(receipt.id!).toArray();
        return { ...receipt, items };
      })
    );
    return receiptsWithItems;
  }, []);

  const handleReceiptClick = (receiptId: number) => {
    navigate(`/items/${receiptId}`);
  };

  return (
    <div className="container mx-auto p-4">
      {/* <h2 className="text-lg font-semibold mb-4">All Scans</h2> */}
      <div className="divide-y divide-muted-foreground">
        {receipts?.map((receipt) => (
          <Card
            key={receipt.id}
            className="bg-card/50 backdrop-blur-sm hover:bg-card/60 transition-colors cursor-pointer w-full border-none"
            onClick={() => handleReceiptClick(receipt.id!)}
          >
            <CardContent className="flex items-center p-0 pb-2">
              {/* <div className="h-10 w-10 rounded-full bg-nutri-purple/10 flex items-center justify-center mr-4">
                <ReceiptIcon className="h-5 w-5 text-nutri-purple" />
              </div> */}
              <div className="flex-1 space-y-1">
                <h3 className="font-medium flex items-center">
                  <ShoppingBag className="h-4 w-4 mr-2 text-nutri-pink" />
                  {receipt.storeName}
                </h3>
                <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
                  <Badge variant="outline" className="w-22 text-center">
                    <Calendar className="w-3 h-3 text-muted-foreground inline" />
                    {new Date(receipt.uploadDate).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit'
                    })}
                  </Badge>
                  <Badge variant="outline" className="w-22 text-center">
                    <Calendar className="w-3 h-3 text-muted-500 mr-1 inline" />
                    {new Date(receipt.purchaseDate).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit'
                    })}
                  </Badge>
                  <Badge variant="outline" className="w-14 text-center">
                    {/* <ShoppingCart className="w-3 h-3 text-orange-500 ml-1 inline" /> */}
                    <ShoppingCart className="w-3 h-3 text-muted-500 ml-1 inline" />
                    <span className="ml-1">{receipt.items?.length || 0}</span>
                  </Badge>
                  <Badge variant="outline" className="w-16 text-center">
                    €{receipt.totalAmount.toFixed(2)}
                  </Badge>
                  {receipt.processed ? (
                    <CheckCircle className="w-3 h-3 text-green-500" />
                  ) : (
                    <Loader className="w-3 h-3 text-yellow-500 animate-spin" />
                  )}
                </div>
              </div>
              {/* <div className="text-right flex flex-col items-end">
              <p className="text-sm text-muted-foreground">
                  {receipt.processed ? "Processed" : "Processing..."}
                </p>
                {receipt.processed && receipt.totalAmount && (
                  <p className="font-medium">€{receipt.totalAmount.toFixed(2)}</p>
                )}
              </div> */}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ScansPage;
