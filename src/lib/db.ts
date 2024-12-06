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
  color: string;
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
      categories: '++id, name, itemCount, color',
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

    // First check direct mappings
    const mapping = await this.categoryMappings
      .where('keyword')
      .equals(name)
      .first();

    if (mapping) {
      console.debug('[DB] Found direct mapping:', mapping);
      return mapping.category;
    }

    // Then check if any keyword is included in the name
    const mappings = await this.categoryMappings.toArray();
    for (const mapping of mappings) {
      if (name.includes(mapping.keyword)) {
        console.debug('[DB] Found keyword match:', mapping);
        return mapping.category;
      }
    }

    console.debug('[DB] No category match found, returning Other for:', name);
    return 'Other';
  }

  async recalculateCategoryCounts() {
    await this.transaction('rw', [this.items, this.categories], async () => {
      // Reset all category counts to 0
      await this.categories.toCollection().modify(cat => {
        cat.itemCount = 0;
      });

      // Get all items
      const items = await this.items.toArray();

      // Count items per category
      const counts: Record<CategoryName, number> = {
        Fruits: 0,
        Vegetables: 0,
        Dairy: 0,
        Meat: 0,
        Bakery: 0,
        Beverages: 0,
        Snacks: 0,
        Other: 0
      };

      items.forEach(item => {
        counts[item.category] = (counts[item.category] || 0) + 1;
      });

      // Update category counts
      await Promise.all(
        Object.entries(counts).map(([category, count]) =>
          this.categories
            .where('name')
            .equals(category)
            .modify(cat => {
              cat.itemCount = count;
            })
        )
      );
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
      { name: 'Fruits', icon: 'apple', itemCount: 0, color: '#4CAF50' },
      { name: 'Vegetables', icon: 'carrot', itemCount: 0, color: '#8BC34A' },
      { name: 'Dairy', icon: 'milk', itemCount: 0, color: '#FFC107' },
      { name: 'Meat', icon: 'beef', itemCount: 0, color: '#F44336' },
      { name: 'Bakery', icon: 'croissant', itemCount: 0, color: '#9C27B0' },
      { name: 'Beverages', icon: 'coffee', itemCount: 0, color: '#2196F3' },
      { name: 'Snacks', icon: 'cookie', itemCount: 0, color: '#FF9800' },
      { name: 'Other', icon: 'grid', itemCount: 0, color: '#9E9E9E' }
    ]);
  }

  // Initialize default category mappings
  const mappingsCount = await db.categoryMappings.count();
  if (mappingsCount === 0) {
    await db.categoryMappings.bulkAdd([
      // Fruits
      { keyword: 'apfel', category: 'Fruits' },
      { keyword: 'banane', category: 'Fruits' },
      { keyword: 'orange', category: 'Fruits' },
      { keyword: 'mango', category: 'Fruits' },
      { keyword: 'birne', category: 'Fruits' },
      { keyword: 'kiwi', category: 'Fruits' },
      { keyword: 'beere', category: 'Fruits' },
      { keyword: 'erdbeere', category: 'Fruits' },
      { keyword: 'himbeere', category: 'Fruits' },
      { keyword: 'blaubeere', category: 'Fruits' },
      { keyword: 'ananas', category: 'Fruits' },
      { keyword: 'zitrone', category: 'Fruits' },
      { keyword: 'limette', category: 'Fruits' },
      // Vegetables
      { keyword: 'karotte', category: 'Vegetables' },
      { keyword: 'salat', category: 'Vegetables' },
      { keyword: 'tomate', category: 'Vegetables' },
      { keyword: 'gurke', category: 'Vegetables' },
      { keyword: 'broccoli', category: 'Vegetables' },
      { keyword: 'paprika', category: 'Vegetables' },
      { keyword: 'zwiebel', category: 'Vegetables' },
      { keyword: 'kartoffel', category: 'Vegetables' },
      { keyword: 'spinat', category: 'Vegetables' },
      { keyword: 'kohl', category: 'Vegetables' },
      { keyword: 'zucchini', category: 'Vegetables' },
      { keyword: 'aubergine', category: 'Vegetables' },
      { keyword: 'pilz', category: 'Vegetables' },
      // Dairy
      { keyword: 'milch', category: 'Dairy' },
      { keyword: 'joghurt', category: 'Dairy' },
      { keyword: 'käse', category: 'Dairy' },
      { keyword: 'butter', category: 'Dairy' },
      { keyword: 'sahne', category: 'Dairy' },
      { keyword: 'quark', category: 'Dairy' },
      { keyword: 'frischkäse', category: 'Dairy' },
      { keyword: 'schmand', category: 'Dairy' },
      { keyword: 'mozarella', category: 'Dairy' },
      // Meat
      { keyword: 'fleisch', category: 'Meat' },
      { keyword: 'wurst', category: 'Meat' },
      { keyword: 'schinken', category: 'Meat' },
      { keyword: 'hähnchen', category: 'Meat' },
      { keyword: 'rind', category: 'Meat' },
      { keyword: 'schwein', category: 'Meat' },
      { keyword: 'fisch', category: 'Meat' },
      { keyword: 'lachs', category: 'Meat' },
      { keyword: 'thunfisch', category: 'Meat' },
      { keyword: 'salami', category: 'Meat' },
      // Bakery
      { keyword: 'brot', category: 'Bakery' },
      { keyword: 'brötchen', category: 'Bakery' },
      { keyword: 'croissant', category: 'Bakery' },
      { keyword: 'kuchen', category: 'Bakery' },
      { keyword: 'gebäck', category: 'Bakery' },
      { keyword: 'toast', category: 'Bakery' },
      { keyword: 'brezel', category: 'Bakery' },
      // Beverages
      { keyword: 'wasser', category: 'Beverages' },
      { keyword: 'saft', category: 'Beverages' },
      { keyword: 'cola', category: 'Beverages' },
      { keyword: 'bier', category: 'Beverages' },
      { keyword: 'wein', category: 'Beverages' },
      { keyword: 'tee', category: 'Beverages' },
      { keyword: 'kaffee', category: 'Beverages' },
      { keyword: 'limonade', category: 'Beverages' },
      { keyword: 'smoothie', category: 'Beverages' },
      // Snacks
      { keyword: 'chips', category: 'Snacks' },
      { keyword: 'nüsse', category: 'Snacks' },
      { keyword: 'schokolade', category: 'Snacks' },
      { keyword: 'keks', category: 'Snacks' },
      { keyword: 'süßigkeit', category: 'Snacks' },
      { keyword: 'bonbon', category: 'Snacks' },
      { keyword: 'gummibär', category: 'Snacks' },
      { keyword: 'riegel', category: 'Snacks' },
      { keyword: 'popcorn', category: 'Snacks' },
      { keyword: 'cracker', category: 'Snacks' }
    ]);
  }
});