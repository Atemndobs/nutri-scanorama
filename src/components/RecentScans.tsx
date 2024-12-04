import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Receipt, ShoppingBag } from "lucide-react";
import { db, type Receipt as ReceiptType } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";

export const RecentScans = () => {
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptType | null>(null);
  
  // Live query receipts from IndexedDB
  const receipts = useLiveQuery(
    () => db.receipts.orderBy('uploadDate').reverse().toArray(),
    []
  );

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Recent Scans</h2>
      {receipts?.map((receipt) => (
        <Card 
          key={receipt.id} 
          className="bg-card/50 backdrop-blur-sm hover:bg-card/60 transition-colors cursor-pointer"
          onClick={() => setSelectedReceipt(receipt)}
        >
          <CardContent className="flex items-center p-4">
            <div className="h-10 w-10 rounded-full bg-nutri-purple/10 flex items-center justify-center mr-4">
              <Receipt className="h-5 w-5 text-nutri-purple" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium flex items-center">
                <ShoppingBag className="h-4 w-4 mr-2 text-nutri-pink" />
                {receipt.storeName}
              </h3>
              <p className="text-sm text-muted-foreground">
                {formatDistanceToNow(receipt.uploadDate, { addSuffix: true })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">
                {receipt.processed ? "Processed" : "Processing..."}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!selectedReceipt} onOpenChange={() => setSelectedReceipt(null)}>
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
                    {formatDistanceToNow(selectedReceipt.uploadDate, { addSuffix: true })}
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedReceipt.processed ? "Processed" : "Processing..."}
                </div>
              </div>
              
              {selectedReceipt.processed ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Sample Item</TableCell>
                      <TableCell>Food</TableCell>
                      <TableCell className="text-right">€9.99</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
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