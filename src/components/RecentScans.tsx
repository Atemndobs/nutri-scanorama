import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Receipt, ShoppingBag } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Dummy data for testing
const dummyReceipt = {
  id: 1,
  storeName: "SuperMarket Plus",
  uploadDate: new Date(),
  processed: true,
  items: [
    { name: "Milk", category: "Dairy", price: 2.99 },
    { name: "Bread", category: "Bakery", price: 1.99 },
    { name: "Eggs", category: "Dairy", price: 3.49 },
    { name: "Bananas", category: "Produce", price: 1.79 },
  ],
  totalAmount: 10.26,
};

export const RecentScans = () => {
  const [selectedReceipt, setSelectedReceipt] = useState<typeof dummyReceipt | null>(null);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Recent Scans</h2>
      <Card 
        className="bg-card/50 backdrop-blur-sm hover:bg-card/60 transition-colors cursor-pointer"
        onClick={() => setSelectedReceipt(dummyReceipt)}
      >
        <CardContent className="flex items-center p-4">
          <div className="h-10 w-10 rounded-full bg-nutri-purple/10 flex items-center justify-center mr-4">
            <Receipt className="h-5 w-5 text-nutri-purple" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium flex items-center">
              <ShoppingBag className="h-4 w-4 mr-2 text-nutri-pink" />
              {dummyReceipt.storeName}
            </h3>
            <p className="text-sm text-muted-foreground">
              {dummyReceipt.uploadDate.toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">
              {dummyReceipt.processed ? "Processed" : "Processing..."}
            </p>
            {dummyReceipt.processed && (
              <p className="font-medium">€{dummyReceipt.totalAmount.toFixed(2)}</p>
            )}
          </div>
        </CardContent>
      </Card>

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
                    {selectedReceipt.uploadDate.toLocaleDateString()}
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedReceipt.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell className="text-right">€{item.price.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={2} className="font-bold">Total</TableCell>
                      <TableCell className="text-right font-bold">
                        €{selectedReceipt.totalAmount.toFixed(2)}
                      </TableCell>
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