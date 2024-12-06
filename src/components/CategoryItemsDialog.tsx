import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { CategoryName } from "@/types/categories";
import { categoryIcons } from "./categories/categoryIcons";
import { formatCurrency } from "@/lib/utils";

interface CategoryItemsDialogProps {
  category: CategoryName;
  color: string;
  isOpen: boolean;
  onClose: () => void;
}

export const CategoryItemsDialog: React.FC<CategoryItemsDialogProps> = ({
  category,
  color,
  isOpen,
  onClose,
}) => {
  const Icon = categoryIcons[category];

  const items = useLiveQuery(
    async () => {
      return await db.items
        .where('category')
        .equals(category)
        .reverse()
        .toArray();
    },
    [category]
  );

  if (!items) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {Icon && <Icon className="w-5 h-5" style={{ color }} />}
            <span className="dialog-title" style={{ color }}>{category}</span>
            <span className="text-sm text-muted-foreground ml-2">
              ({items.length} items)
            </span>
          </DialogTitle>
        </DialogHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.name}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(item.price)}
                </TableCell>
                <TableCell className="text-right">
                  {new Date(item.date).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
};
