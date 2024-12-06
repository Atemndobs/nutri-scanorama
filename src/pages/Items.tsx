import React from 'react';
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, Trash, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { capitalizeFirstLetter } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CategoryName, defaultCategories } from "@/types/categories";
import { categoryIcons } from "@/components/categories/categoryIcons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, ShoppingCart, Flame } from "lucide-react";

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

  const handleInputChange = async (field: keyof UpdateSpec, value: string | number) => {
    const newEditForm = {
      ...editForm,
      [field]: field === 'category' ? value as CategoryName : value
    };
    setEditForm(newEditForm);

    // If it's a category change, save immediately
    if (field === 'category' && editingItemId) {
      await handleSave(editingItemId, newEditForm);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, itemId: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave(itemId);
    }
  };

  const handleSave = async (itemId: number, formData = editForm) => {
    try {
      const item = await db.items.get(itemId);
      if (!item) throw new Error('Item not found');

      await db.transaction('rw', [db.items, db.categories, db.receipts], async () => {
        // If category is being changed, update category counts
        if (formData.category && formData.category !== item.category) {
          console.debug('[ItemsPage] Category change detected:', {
            from: item.category,
            to: formData.category
          });

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
            .equals(formData.category!)
            .modify(cat => {
              cat.itemCount = (cat.itemCount || 0) + 1;
            });
        }

        // Update the item
        await db.items.update(itemId, formData);

        // If price was changed, update receipt total
        if (formData.price !== undefined && formData.price !== item.price) {
          // Get all items for this receipt to calculate new total
          const receiptItems = await db.items
            .where('receiptId')
            .equals(item.receiptId)
            .toArray();

          // Calculate new total (including the updated price)
          const newTotal = receiptItems.reduce((sum, currentItem) => {
            const price = currentItem.id === itemId ? formData.price! : currentItem.price;
            return sum + price;
          }, 0);

          // Update receipt with new total
          await db.receipts.update(item.receiptId, {
            totalAmount: newTotal
          });
        }
      });

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
      const item = await db.items.get(itemId);
      if (!item) throw new Error('Item not found');

      await db.transaction('rw', [db.items, db.categories], async () => {
        // Decrement category count
        await db.categories
          .where('name')
          .equals(item.category)
          .modify(cat => {
            cat.itemCount = Math.max(0, (cat.itemCount || 0) - 1);
          });

        // Delete the item
        await db.items.delete(itemId);
      });

      toast({
        title: "Item deleted",
        description: "The item has been successfully deleted.",
      });
    } catch (error) {
      console.error('[ItemsPage] Error deleting item:', error);
      toast({
        title: "Error",
        description: "Failed to delete item.",
        variant: "destructive",
      });
    }
  };

  if (!parsedReceiptId || isNaN(parsedReceiptId)) {
    return (
      <div className="container max-w-md mx-auto p-4">
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
      <div className="container max-w-md mx-auto p-4">
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
    <div className="h-[calc(100vh-4rem)] overflow-hidden bg-background">
      <div className="container max-w-md mx-auto px-2">
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <h1 className="font-semibold flex items-center whitespace-nowrap">
                {receipt?.storeName}
                {receipt?.storeAddress && (
                  <span className="ml-2 text-xs text-muted-foreground truncate" style={{ maxWidth: '200px' }}>
                    {receipt.storeAddress}
                  </span>
                )}
              </h1>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <span>
                  <Calendar className="w-3 h-3 text-blue-500 mr-1 inline" />
                  {new Date(receipt.uploadDate).toLocaleDateString('de-DE', {
                    day: 'numeric',
                    month: '2-digit',
                    year: '2-digit'
                  })}
                </span>
                <span>
                  <ShoppingCart className="w-3 h-3 text-green-500 ml-1 inline" />
                  <span className="ml-1">{items?.length || 0}</span>
                </span>
                <span>
                  €{receipt.totalAmount?.toFixed(2)}
                </span>
                <span>
                  <Flame className="w-3 h-3 text-orange-500 mr-1 inline" />
                  2000 kcal
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="-mx-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50%]">Item</TableHead>
                <TableHead className="w-[20%]"></TableHead>
                <TableHead className="w-[15%] text-right">Price</TableHead>
                <TableHead className="w-[15%]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items?.map((item: Item) => (
                <TableRow key={item.id}>
                  {editingItemId === item.id ? (
                    <>
                      <TableCell>
                        <Input
                          value={editForm.name ?? capitalizeFirstLetter(item.name)}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, item.id!)}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={editForm.category ?? item.category}
                          onValueChange={(value) => handleInputChange('category', value)}
                        >
                          <SelectTrigger className="w-15 px-2">
                            <SelectValue>
                              {editForm.category && (
                                <div className="flex items-center justify-center">
                                  {React.createElement(categoryIcons[editForm.category], {
                                    className: "h-4 w-4",
                                    style: { color: defaultCategories[editForm.category].color }
                                  })}
                                </div>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent align="start" className="min-w-[120px]">
                            {Object.entries(categoryIcons).map(([category, Icon]) => (
                              <SelectItem key={category} value={category}>
                                <div className="flex items-center gap-2">
                                  {React.createElement(Icon, {
                                    className: "h-4 w-4",
                                    style: { color: defaultCategories[category as CategoryName].color }
                                  })}
                                  <span className="capitalize">{category.toLowerCase().replace('_', ' ')}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={editForm.price ?? item.price}
                          onChange={(e) => handleInputChange('price', parseFloat(e.target.value))}
                          onKeyDown={(e) => handleKeyDown(e, item.id!)}
                          step="0.01"
                          min="0"
                          className="w-16 text-right"
                        />
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="text-left">{capitalizeFirstLetter(item.name)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center">
                          {React.createElement(categoryIcons[item.category], { 
                            className: "h-4 w-4",
                            style: { color: defaultCategories[item.category].color }
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">€{item.price.toFixed(2)}</TableCell>
                    </>
                  )}
                  <TableCell>
                    <div className="flex justify-end space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          if (editingItemId === item.id) {
                            handleSave(item.id!);
                          } else {
                            setEditingItemId(item.id!);
                            setEditForm({});
                          }
                        }}
                      >
                        {editingItemId === item.id ? (
                          <Save className="h-4 w-4" />
                        ) : (
                          <Pencil className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
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
    </div>
  );
};