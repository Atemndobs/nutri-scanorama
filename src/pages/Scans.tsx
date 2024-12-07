import React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt as ReceiptIcon, ShoppingBag } from "lucide-react";
import { Calendar, ShoppingCart, Wand2, CheckCircle, Loader } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { categoryIcons } from "@/components/categories/categoryIcons";
import { CategoryName, defaultCategories } from "@/types/categories";
import { ReceiptItem } from "@/lib/db";
import { capitalizeFirstLetter } from "@/lib/utils";

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
      <div className="divide-y divide-muted-foreground">
        {receipts?.map((receipt) => (
          <Card
            key={receipt.id}
            className="bg-card/50 backdrop-blur-sm hover:bg-card/60 transition-colors cursor-pointer w-full border-none"
            onClick={() => handleReceiptClick(receipt.id!)}
          >
            <CardContent className="p-4">
              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium flex items-center">
                    <ShoppingBag className="h-4 w-4 mr-2 text-nutri-pink" />
                    {receipt.storeName}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      {new Date(receipt.uploadDate).toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit'
                      })}
                    </Badge>
                    {receipt.processed ? (
                      <CheckCircle className="w-3 h-3 text-green-500" />
                    ) : (
                      <Loader className="w-3 h-3 text-yellow-500 animate-spin" />
                    )}
                  </div>
                </div>

                {receipt.processed && receipt.items && (
                  <div className="overflow-y-auto max-h-96">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-left">Item</TableHead>
                          <TableHead className="text-left">Category</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {receipt.items.map((item: ReceiptItem, index: number) => {
                          const Icon = categoryIcons[item.category || 'Other'];
                          return (
                            <TableRow key={index}>
                              <TableCell className="font-medium text-left">{capitalizeFirstLetter(item.name)}</TableCell>
                              <TableCell className="text-left">
                                <div className="flex items-center gap-2">
                                  {Icon && <Icon className="h-4 w-4" style={{ color: defaultCategories[item.category as CategoryName].color }} />}
                                  {item.category || 'Other'}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">€{item.price.toFixed(2)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ScansPage;
