import Dexie, { Table } from 'dexie';
import type { CategoryName } from '../types/categories';

export interface ReceiptItem {
  id?: number;
  name: string;
  category: CategoryName;
  price: number;
  receiptId: number;
  date: Date;
}

export interface Receipt {
  id?: number;
  storeName: string;
  imageData: string;
  uploadDate: Date;
  processed: boolean;
  items?: ReceiptItem[];
  totalAmount?: number;
}

export interface Category {
  id?: number;
  name: CategoryName;
  icon: string;
  itemCount: number;
}

export interface CategoryMapping {
  id?: number;
  keyword: string;
  category: CategoryName;
}

export class NutriScanDB extends Dexie {
  receipts!: Table<Receipt>;
  items!: Table<ReceiptItem>;
  categories!: Table<Category>;
  categoryMappings!: Table<CategoryMapping>;

  constructor() {
    super('nutriscan');
    this.version(4).stores({
      receipts: '++id, storeName, uploadDate, processed',
      items: '++id, receiptId, category, name',
      categories: '++id, name, itemCount',
      categoryMappings: '++id, keyword, category'
    });
  }

  async clearAllData() {
    await this.transaction('rw', [this.receipts, this.items, this.categories, this.categoryMappings], async () => {
      await this.receipts.clear();
      await this.items.clear();
      
      // Reset category counts instead of clearing
      await this.categories.toCollection().modify(category => {
        category.itemCount = 0;
      });

      // Keep category mappings intact
      // await this.categoryMappings.clear();
    });
  }

  async deleteReceipt(receiptId: number) {
    await this.transaction('rw', [this.receipts, this.items, this.categories], async () => {
      // Get all items for this receipt
      const items = await this.items.where('receiptId').equals(receiptId).toArray();
      
      // Update category counts
      const categoryUpdates = items.reduce((acc: Record<string, number>, item) => {
        if (item.category) {
          acc[item.category] = (acc[item.category] || 0) + 1;
        }
        return acc;
      }, {});

      // Decrease item counts for affected categories
      await Promise.all(
        Object.entries(categoryUpdates).map(([category, count]) =>
          this.categories
            .where('name')
            .equals(category)
            .modify(cat => {
              cat.itemCount = Math.max(0, (cat.itemCount || 0) - count);
            })
        )
      );

      // Delete items and receipt
      await this.items.where('receiptId').equals(receiptId).delete();
      await this.receipts.delete(receiptId);
    });
  }

  async determineCategory(itemName: string): Promise<CategoryName> {
    console.debug('[DB] Starting category determination for:', itemName);
    const name = itemName.toLowerCase();
    const mappings = await this.categoryMappings.toArray();
    console.debug('[DB] Found category mappings:', mappings);
    
    // Find the first matching keyword
    const match = mappings.find(mapping => {
      const matches = name.includes(mapping.keyword.toLowerCase());
      console.debug(`[DB] Checking "${name}" against keyword "${mapping.keyword.toLowerCase()}":`, matches);
      return matches;
    });
    
    if (match) {
      console.debug('[DB] Found category match:', { item: name, keyword: match.keyword, category: match.category });
      return match.category;
    }

    // Default mappings for common items
    console.debug('[DB] No direct mapping found, checking patterns');
    if (name.includes('broccoli')) {
      console.debug('[DB] Matched pattern: broccoli -> Vegetables');
      return 'Vegetables';
    }
    if (name.includes('mango')) {
      console.debug('[DB] Matched pattern: mango -> Fruits');
      return 'Fruits';
    }
    if (name.includes('avocado')) {
      console.debug('[DB] Matched pattern: avocado -> Vegetables');
      return 'Vegetables';
    }
    if (name.includes('croissant') || name.includes('donut') || name.includes('pastel')) {
      console.debug('[DB] Matched pattern: bakery item -> Bakery');
      return 'Bakery';
    }
    if (name.includes('schenkel')) {
      console.debug('[DB] Matched pattern: schenkel -> Meat');
      return 'Meat';
    }

    console.debug('[DB] No category match found, returning Other for:', name);
    return 'Other';
  }

  async recalculateCategoryCounts() {
    console.debug('[DB] Starting category count recalculation');
    await this.transaction('rw', [this.items, this.categories], async () => {
      // Get all items and count by category
      const items = await this.items.toArray();
      const counts = items.reduce((acc: Record<CategoryName, number>, item) => {
        acc[item.category] = (acc[item.category] || 0) + 1;
        return acc;
      }, {} as Record<CategoryName, number>);

      console.debug('[DB] Calculated counts:', counts);

      // Update all categories
      await this.categories.toCollection().modify(category => {
        category.itemCount = counts[category.name] || 0;
      });

      console.debug('[DB] Category counts updated');
    });
  }

  async incrementCategoryCount(category: CategoryName) {
    const categoryRecord = await this.categories.where('name').equals(category).first();
    if (categoryRecord) {
      await this.categories.where('name').equals(category).modify(cat => {
        cat.itemCount += 1;
      });
    }
  }
}

export const db = new NutriScanDB();

// Initialize default categories
db.on('ready', async () => {
  const categoriesCount = await db.categories.count();
  if (categoriesCount === 0) {
    await db.categories.bulkAdd([
      { name: 'Groceries', icon: 'shopping-cart', itemCount: 0 },
      { name: 'Beverages', icon: 'coffee', itemCount: 0 },
      { name: 'Snacks', icon: 'cookie', itemCount: 0 },
      { name: 'Household', icon: 'home', itemCount: 0 },
      { name: 'Fruits', icon: 'apple', itemCount: 0 },
      { name: 'Vegetables', icon: 'carrot', itemCount: 0 },
      { name: 'Dairy', icon: 'milk', itemCount: 0 },
      { name: 'Meat', icon: 'beef', itemCount: 0 },
      { name: 'Bakery', icon: 'croissant', itemCount: 0 },
      { name: 'Personal Care', icon: 'bath', itemCount: 0 },
      { name: 'Other', icon: 'grid', itemCount: 0 }
    ]);
  }

  // Initialize default category mappings
  const mappingsCount = await db.categoryMappings.count();
  if (mappingsCount === 0) {
    await db.categoryMappings.bulkAdd([
      // Fruits
      { keyword: 'mango', category: 'Fruits' },
      { keyword: 'apfel', category: 'Fruits' },
      { keyword: 'banane', category: 'Fruits' },
      { keyword: 'orange', category: 'Fruits' },
      // Vegetables
      { keyword: 'broccoli', category: 'Vegetables' },
      { keyword: 'karotte', category: 'Vegetables' },
      { keyword: 'salat', category: 'Vegetables' },
      { keyword: 'tomate', category: 'Vegetables' },
      { keyword: 'avocado', category: 'Vegetables' },
      // Dairy
      { keyword: 'milch', category: 'Dairy' },
      { keyword: 'joghurt', category: 'Dairy' },
      { keyword: 'käse', category: 'Dairy' },
      // Meat
      { keyword: 'fleisch', category: 'Meat' },
      { keyword: 'wurst', category: 'Meat' },
      { keyword: 'schinken', category: 'Meat' },
      { keyword: 'spiessbraten', category: 'Meat' },
      { keyword: 'schenkel', category: 'Meat' },
      // Bakery
      { keyword: 'brot', category: 'Bakery' },
      { keyword: 'brötchen', category: 'Bakery' },
      { keyword: 'croissant', category: 'Bakery' },
      { keyword: 'donut', category: 'Bakery' },
      { keyword: 'pastel', category: 'Bakery' },
      // Beverages
      { keyword: 'wasser', category: 'Beverages' },
      { keyword: 'saft', category: 'Beverages' },
      // Snacks
      { keyword: 'chips', category: 'Snacks' },
      { keyword: 'schokolade', category: 'Snacks' },
      // Household
      { keyword: 'papier', category: 'Household' },
      { keyword: 'reiniger', category: 'Household' },
      // Personal Care
      { keyword: 'seife', category: 'Personal Care' },
      { keyword: 'shampoo', category: 'Personal Care' }
    ]);
  }
});