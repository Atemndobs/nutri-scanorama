import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Trash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const ItemsPage = () => {
  const { receiptId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [editingItemId, setEditingItemId] = useState<number | null>(null);

  const receipt = useLiveQuery(
    () => db.receipts.get(Number(receiptId)),
    [receiptId]
  );

  const handleEditItem = async (itemId: number, updates: Partial<typeof item>) => {
    try {
      await db.items.update(itemId, updates);
      setEditingItemId(null);
      toast({
        title: "Item updated",
        description: "The item has been successfully updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update item.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    try {
      await db.items.delete(itemId);
      toast({
        title: "Item deleted",
        description: "The item has been successfully deleted.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete item.",
        variant: "destructive",
      });
    }
  };

  if (!receipt) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="h-8 w-8"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">{receipt.storeName}</h1>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {receipt.items?.map((item) => (
              <TableRow key={item.id}>
                {editingItemId === item.id ? (
                  <>
                    <TableCell>
                      <Input
                        defaultValue={item.name}
                        onChange={(e) =>
                          handleEditItem(item.id!, { name: e.target.value })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        defaultValue={item.category}
                        onChange={(e) =>
                          handleEditItem(item.id!, { category: e.target.value })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        defaultValue={item.price}
                        onChange={(e) =>
                          handleEditItem(item.id!, {
                            price: parseFloat(e.target.value),
                          })
                        }
                      />
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell className="text-right">
                      €{item.price.toFixed(2)}
                    </TableCell>
                  </>
                )}
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        editingItemId === item.id
                          ? setEditingItemId(null)
                          : setEditingItemId(item.id!)
                      }
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteItem(item.id!)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};