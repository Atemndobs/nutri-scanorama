import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Receipt as ReceiptIcon, ShoppingBag } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "./ui/badge";
import { categoryIcons } from "@/components/categories/categoryIcons";
import { CategoryName, defaultCategories } from "@/types/categories";
import { Receipt, ReceiptItem } from "@/lib/db";

interface RecentScansProps {
  className?: string;
}

export const RecentScans: React.FC<RecentScansProps> = ({ className }) => {
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const loadReceiptWithItems = async (receipt: Receipt) => {
    console.debug('[RecentScans] Processing receipt:', receipt);
    console.debug('[RecentScans] Receipt ID:', receipt.id);
    if (!receipt.processed) {
      console.debug('[RecentScans] Receipt not processed, returning early');
      return receipt;
    }

    try {
      console.debug('[RecentScans] Querying items for receipt ID:', receipt.id);
      const items = await db.items
        .where('receiptId')
        .equals(receipt.id!)
        .toArray();

      console.debug(`[RecentScans] Loaded ${items.length} items for receipt ${receipt.id}`);
      console.debug('[RecentScans] Items:', items);

      if (items.length === 0) {
        console.warn('[RecentScans] No items found for processed receipt:', receipt.id);
        // Double check if items exist directly
        const allItems = await db.items.toArray();
        console.debug('[RecentScans] All items in database:', allItems);
      }

      const result = {
        ...receipt,
        items: items.map(item => ({
          ...item
        }))
      };
      console.debug('[RecentScans] Returning receipt with items:', result);
      return result;
    } catch (error) {
      console.error('[RecentScans] Error loading items:', error);
      return receipt;
    }
  };
  
  const receipts = useLiveQuery(async () => {
    console.debug('[RecentScans] Loading recent receipts...');
    const recentReceipts = await db.receipts
      .orderBy('uploadDate')
      .reverse()
      .limit(3)
      .toArray();

    console.debug('[RecentScans] Found recent receipts:', recentReceipts);

    // Load items and categories for each receipt
    console.debug('[RecentScans] Loading items for receipts...');
    const receiptsWithItems = await Promise.all(
      recentReceipts.map(loadReceiptWithItems)
    );

    console.debug('[RecentScans] Finished loading all receipts with items');
    return receiptsWithItems;
  });

  const handleReceiptClick = async (receipt: Receipt) => {
    console.debug('[RecentScans] Receipt clicked:', receipt);
    const receiptWithItems = await loadReceiptWithItems(receipt);
    console.debug('[RecentScans] Loaded receipt with items for dialog:', receiptWithItems);
    console.debug('[RecentScans] Receipt items:', receiptWithItems.items);
    setSelectedReceipt(receiptWithItems);
  };

  const handleViewItems = (receiptId: number) => {
    navigate(`/items/${receiptId}`);
  };

  const handleDeleteReceipt = async (receiptId: number) => {
    try {
      await db.deleteReceipt(receiptId);
      setSelectedReceipt(null);
      toast({
        title: "Receipt deleted",
        description: "Receipt and its items have been deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting receipt:', error);
      toast({
        title: "Error",
        description: "Failed to delete receipt.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <h2 className="text-lg font-semibold">Recent Scans</h2>
      {receipts?.map((receipt) => (
        <Card
          key={receipt.id}
          className="bg-card/50 backdrop-blur-sm hover:bg-card/60 transition-colors cursor-pointer"
          onClick={() => handleReceiptClick(receipt)}
        >
          <CardContent className="flex items-center p-4">
            <div className="h-10 w-10 rounded-full bg-nutri-purple/10 flex items-center justify-center mr-4">
              <ReceiptIcon className="h-5 w-5 text-nutri-purple" />
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="font-medium flex items-center">
                <ShoppingBag className="h-4 w-4 mr-2 text-nutri-pink" />
                {receipt.storeName}
              </h3>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <p>{new Date(receipt.uploadDate).toLocaleDateString()}</p>
                {receipt.processed && receipt.items && (
                  <p>• {receipt.items.length} items</p>
                )}
              </div>
            </div>
            <div className="text-right flex flex-col items-end">
              <p className="text-sm text-muted-foreground">
                {receipt.processed ? "Processed" : "Processing..."}
              </p>
              {receipt.processed && receipt.totalAmount && (
                <p className="font-medium">€{receipt.totalAmount.toFixed(2)}</p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!selectedReceipt} onOpenChange={(open) => {
        console.debug('[RecentScans] Dialog open state changed:', open);
        console.debug('[RecentScans] Current selectedReceipt:', selectedReceipt);
        if (!open) setSelectedReceipt(null);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Receipt Details</DialogTitle>
          </DialogHeader>
          {selectedReceipt && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{selectedReceipt.storeName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedReceipt.uploadDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedReceipt.processed ? (
                    <span className="text-green-500">Processed</span>
                  ) : (
                    <span className="text-yellow-500">Processing...</span>
                  )}
                </div>
              </div>
              
              {selectedReceipt.processed && selectedReceipt.items ? (
                <>
                  {console.debug('[RecentScans] Receipt is processed and has items. Items count:', selectedReceipt.items.length)}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedReceipt.items.map((item: ReceiptItem, index: number) => {
                        const Icon = categoryIcons[item.category || 'Other'];
                        return (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {Icon && <Icon className="h-4 w-4" style={{ color: defaultCategories[item.category as CategoryName].color }} />}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">€{item.price.toFixed(2)}</TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow>
                        <TableCell colSpan={2} className="font-bold">Total</TableCell>
                        <TableCell className="text-right font-bold">
                          €{selectedReceipt.totalAmount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="destructive"
                      onClick={() => handleDeleteReceipt(selectedReceipt.id)}
                    >
                      Delete Receipt
                    </Button>
                    <Button
                      onClick={() => {
                        setSelectedReceipt(null);
                        handleViewItems(selectedReceipt.id);
                      }}
                    >
                      Edit Items
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Receipt is being processed...
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};