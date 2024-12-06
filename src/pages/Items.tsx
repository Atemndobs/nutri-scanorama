import React from 'react';
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { CategoryName } from "@/types/categories";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Item {
  id?: number;
  name: string;
  category: CategoryName;
  price: number;
  receiptId: number;
}

interface UpdateSpec {
  name?: string;
  category?: CategoryName;
  price?: number;
}

export const ItemsPage = () => {
  const { receiptId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<UpdateSpec>({});

  // Validate and convert receiptId to number
  const parsedReceiptId = receiptId ? parseInt(receiptId, 10) : null;

  const receipt = useLiveQuery(
    async () => {
      console.debug('[ItemsPage] Querying receipt:', parsedReceiptId);
      const result = parsedReceiptId ? await db.receipts.get(parsedReceiptId) : null;
      console.debug('[ItemsPage] Found receipt:', result);
      return result;
    },
    [parsedReceiptId]
  );

  const items = useLiveQuery(
    async () => {
      if (!parsedReceiptId) {
        console.debug('[ItemsPage] No receiptId, skipping items query');
        return [];
      }
      console.debug('[ItemsPage] Querying items for receipt:', parsedReceiptId);
      const result = await db.items
        .where('receiptId')
        .equals(parsedReceiptId)
        .toArray();
      console.debug('[ItemsPage] Found items:', result);
      return result;
    },
    [parsedReceiptId]
  );

  const handleInputChange = (field: keyof UpdateSpec, value: string | number) => {
    setEditForm(prev => ({
      ...prev,
      [field]: field === 'category' ? value as CategoryName : value
    }));
  };

  const handleSave = async (itemId: number) => {
    try {
      const item = await db.items.get(itemId);
      if (!item) throw new Error('Item not found');

      // If category is being changed, update category counts
      if (editForm.category && editForm.category !== item.category) {
        console.debug('[ItemsPage] Category change detected:', {
          from: item.category,
          to: editForm.category
        });

        await db.transaction('rw', [db.items, db.categories], async () => {
          // Decrement old category count
          await db.categories
            .where('name')
            .equals(item.category)
            .modify(cat => {
              cat.itemCount = Math.max(0, (cat.itemCount || 0) - 1);
            });

          // Increment new category count
          await db.categories
            .where('name')
            .equals(editForm.category!)
            .modify(cat => {
              cat.itemCount = (cat.itemCount || 0) + 1;
            });

          // Update the item
          await db.items.update(itemId, editForm);
        });
      } else {
        // If no category change, just update the item
        await db.items.update(itemId, editForm);
      }

      setEditingItemId(null);
      setEditForm({});
      toast({
        title: "Item updated",
        description: "The item has been successfully updated.",
      });
    } catch (error) {
      console.error('[ItemsPage] Error updating item:', error);
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

  if (!parsedReceiptId || isNaN(parsedReceiptId)) {
    return (
      <div className="container max-w-2xl mx-auto p-4">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Invalid Receipt ID</h1>
        </div>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="container max-w-2xl mx-auto p-4">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Loading...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center space-x-4 mb-4">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Receipt Items</h1>
      </div>

      {receipt && (
        <div className="mb-4">
          <p className="text-muted-foreground">
            {receipt.storeName} - {new Date(receipt.uploadDate).toLocaleDateString()}
          </p>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Price</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items?.map((item: Item) => (
            <TableRow key={item.id}>
              {editingItemId === item.id ? (
                <>
                  <TableCell key={`name-${item.id}`}>
                    <Input
                      value={editForm.name ?? item.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                    />
                  </TableCell>
                  <TableCell key={`category-${item.id}`}>
                    <Select
                      value={editForm.category ?? item.category}
                      onValueChange={(value) => handleInputChange('category', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Groceries">Groceries</SelectItem>
                        <SelectItem value="Beverages">Beverages</SelectItem>
                        <SelectItem value="Snacks">Snacks</SelectItem>
                        <SelectItem value="Household">Household</SelectItem>
                        <SelectItem value="Fruits">Fruits</SelectItem>
                        <SelectItem value="Vegetables">Vegetables</SelectItem>
                        <SelectItem value="Dairy">Dairy</SelectItem>
                        <SelectItem value="Meat">Meat</SelectItem>
                        <SelectItem value="Bakery">Bakery</SelectItem>
                        <SelectItem value="Personal Care">Personal Care</SelectItem>
                        <SelectItem value="Sweets">Sweets</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell key={`price-${item.id}`} className="text-right">
                    <Input
                      type="number"
                      value={editForm.price ?? item.price}
                      onChange={(e) => handleInputChange('price', parseFloat(e.target.value))}
                    />
                  </TableCell>
                </>
              ) : (
                <>
                  <TableCell key={`name-${item.id}`}>{item.name}</TableCell>
                  <TableCell key={`category-${item.id}`}>{item.category}</TableCell>
                  <TableCell key={`price-${item.id}`} className="text-right">
                    €{item.price.toFixed(2)}
                  </TableCell>
                </>
              )}
              <TableCell key={`actions-${item.id}`}>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (editingItemId === item.id) {
                        handleSave(item.id!);
                      } else {
                        setEditingItemId(item.id!);
                        setEditForm({});
                      }
                    }}
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
  );
};