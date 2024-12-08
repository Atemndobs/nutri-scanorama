import Dexie, { Table } from 'dexie';
import type { CategoryName } from '../types/categories';
import { normalizeKeyword } from './db/categoryMappings';

export interface ReceiptItem {
  id?: number;
  name: string;
  category: CategoryName;
  price: number;
  quantity?: number;
  pricePerUnit?: number;
  taxRate: string;
  receiptId: number;
  date: Date;
}

export interface Receipt {
  id?: number;
  storeName: string;
  storeAddress: string;
  imageData: string;
  uploadDate: Date;
  purchaseDate: Date;
  processed: boolean;
  items?: ReceiptItem[];
  totalAmount: number;
  text?: string;
  discrepancyDetected?: boolean;
  taxDetails: {
    taxRateA: { rate: number; net: number; tax: number; gross: number; };
    taxRateB: { rate: number; net: number; tax: number; gross: number; };
  };
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

export interface SyncQueueItem {
  id?: number;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: number;
  processed?: boolean;
}

// Removing Dexie.Transaction from NutriScanTransaction interface
interface NutriScanTransaction {
  receipts: Table<Receipt>;
  items: Table<ReceiptItem>;
  categories: Table<Category>;
  categoryMappings: Table<CategoryMapping>;
  syncQueue: Table<SyncQueueItem>;
}

export class NutriScanDB extends Dexie {
  receipts!: Table<Receipt>;
  items!: Table<ReceiptItem>;
  categories!: Table<Category>;
  categoryMappings!: Table<CategoryMapping>;
  syncQueue!: Table<SyncQueueItem>;

  constructor() {
    super('nutriscan');
    this.version(8).stores({
      receipts: '++id, storeName, storeAddress, uploadDate, purchaseDate, processed, totalAmount, discrepancyDetected',
      items: '++id, receiptId, category, name, taxRate, price, quantity, pricePerUnit',
      categories: '++id, name, itemCount, color',
      categoryMappings: '++id, keyword, category',
      syncQueue: '++id, type, table, timestamp, processed'
    });

    this.version(7).upgrade(tx => {
      return tx.receipts.toCollection().modify(receipt => {
        if (!receipt.text) receipt.text = '';
        if (typeof receipt.discrepancyDetected === 'undefined') {
          receipt.discrepancyDetected = false;
        }
      });
    });

    this.version(6).upgrade(tx => {
      return tx.receipts.toCollection().modify(receipt => {
        if (!receipt.storeAddress) receipt.storeAddress = '';
        if (!receipt.purchaseDate) receipt.purchaseDate = receipt.uploadDate;
        if (!receipt.taxDetails) {
          receipt.taxDetails = {
            taxRateA: { rate: 19, net: 0, tax: 0, gross: 0 },
            taxRateB: { rate: 7, net: 0, tax: 0, gross: 0 }
          };
        }
        if (typeof receipt.totalAmount !== 'number') receipt.totalAmount = 0;
      });
    });

    this.version(6).upgrade(async tx => {
      // Update items that should be in Cereals category
      await tx.items.toCollection().modify(item => {
        const name = item.name.toLowerCase();
        if (
          name.includes('reis') ||
          name.includes('pasta') ||
          name.includes('nudel') ||
          name.includes('müsli') ||
          name.includes('muesli') ||
          name.includes('cornflakes') ||
          name.includes('spiral') ||
          name.includes('haferflocken')
        ) {
          item.category = 'Cereals';
        }
      });
    });
  }

  async clearAllData() {
    await this.transaction('rw', [this.receipts, this.items, this.categories, this.categoryMappings, this.syncQueue], async () => {
      await this.receipts.clear();
      await this.items.clear();
      
      // Reset category counts instead of clearing
      await this.categories.toCollection().modify(category => {
        category.itemCount = 0;
      });

      // Keep category mappings intact
      // await this.categoryMappings.clear();
      await this.syncQueue.clear();
    });
  }

  async deleteFailedScan(receiptId: number) {
    await this.transaction('rw', this.receipts, this.items, async () => {
      // Delete all items associated with this receipt
      await this.items.where('receiptId').equals(receiptId).delete();
      // Delete the receipt itself
      await this.receipts.delete(receiptId);
    });
  }

  async deleteReceipt(receiptId: number) {
    await this.transaction('rw', [this.receipts, this.items, this.categories], async function (this: NutriScanDB) {
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
    const nameBefore = normalizeKeyword(itemName);

    
    try {
      const name = normalizeKeyword(itemName);
      // console.debug('[DB MATCHING] Starting category determination:', { 
      //   itemName, 
      //   normalizedName: name
      // });

      // First check direct mappings
      const mapping = await this.categoryMappings
        .where('keyword')
        .equals(name)
        .first();

      if (mapping) {
        console.debug('[DB MATCHING] Found direct mapping:', { 
          keyword: mapping.keyword, 
          category: mapping.category 
        });
        return mapping.category;
      }

      // Then check if any keyword is included in the name
      const mappings = await this.categoryMappings.toArray();
      
      for (const mapping of mappings) {
        const normalizedKeyword = normalizeKeyword(mapping.keyword);
        if (name.includes(normalizedKeyword)) {
          console.debug('[DB MATCHING] Found keyword match:', { 
            keyword: mapping.keyword, 
            category: mapping.category,
            itemName,
            normalizedName: name
          });
          return mapping.category;
        }
      }
    } catch (error) {
      console.error('[DB MATCHING] Error:', { itemName, error });
    }

    // console.debug('[DB MATCHING] No category match found:', { 
    //   itemName, 
    //   normalizedName: nameBefore, 
    //   result: 'Other' 
    // });
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
        Cereals: 0,
        Sweets: 0,
        Oils: 0,
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
      { name: 'Cereals', icon: 'wheat', itemCount: 0, color: '#795548' },
      { name: 'Sweets', icon: 'candy', itemCount: 0, color: '#FFC0CB' },
      { name: 'Oils', icon: 'oil', itemCount: 0, color: '#FFD700' },
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
      { keyword: 'banane chiquita', category: 'Fruits' },
      { keyword: 'birne abate fete', category: 'Fruits' },
      // Vegetables
      { keyword: 'karotte', category: 'Vegetables' },
      { keyword: 'salat', category: 'Vegetables' },
      { keyword: 'tomate', category: 'Vegetables' },
      { keyword: 'romarispen', category: 'Vegetables' },
      { keyword: 'romanita', category: 'Vegetables' },
      { keyword: 'roma-', category: 'Vegetables' },
      { keyword: 'gurke', category: 'Vegetables' },
      { keyword: 'broccoli', category: 'Vegetables' },
      { keyword: 'brokkoli', category: 'Vegetables' },
      { keyword: 'paprika', category: 'Vegetables' },
      { keyword: 'zwiebel', category: 'Vegetables' },
      { keyword: 'kartoffel', category: 'Vegetables' },
      { keyword: 'spinat', category: 'Vegetables' },
      { keyword: 'kohl', category: 'Vegetables' },
      { keyword: 'zucchini', category: 'Vegetables' },
      { keyword: 'aubergine', category: 'Vegetables' },
      { keyword: 'pilz', category: 'Vegetables' },
      { keyword: 'avocado', category: 'Vegetables' },
      { keyword: 'vorger', category: 'Vegetables' }, // For pre-prepared vegetables
      { keyword: 'gusto', category: 'Vegetables' }, // For Tomato al Gusto products
      { keyword: 'al gusto', category: 'Vegetables' }, // For Tomato al Gusto products
      { keyword: 'kidneybohnen', category: 'Vegetables' },
      { keyword: 'pesto rosso', category: 'Vegetables' },
      { keyword: 'zwiebel bravos', category: 'Vegetables' },
      { keyword: 'broccoli neutral', category: 'Vegetables' },
      { keyword: 'paprika rot sp', category: 'Vegetables' },
      // Cereals
      { keyword: 'reis', category: 'Cereals' },
      { keyword: 'parboiled', category: 'Cereals' },
      { keyword: 'spiral', category: 'Cereals' }, // For pasta spirals
      { keyword: 'spiralen', category: 'Cereals' }, // German pasta spirals
      { keyword: 'nudel', category: 'Cereals' },
      { keyword: 'pasta', category: 'Cereals' },
      { keyword: 'müsli', category: 'Cereals' },
      { keyword: 'muesli', category: 'Cereals' },
      { keyword: 'cornflakes', category: 'Cereals' },
      { keyword: 'haferflocken', category: 'Cereals' },
      // Dairy
      { keyword: 'milch', category: 'Dairy' },
      { keyword: 'joghurt', category: 'Dairy' },
      { keyword: 'fr. jog. natur', category: 'Dairy' },
      { keyword: 'käse', category: 'Dairy' },
      { keyword: 'butter', category: 'Dairy' },
      { keyword: 'sahne', category: 'Dairy' },
      { keyword: 'quark', category: 'Dairy' },
      { keyword: 'frischkäse', category: 'Dairy' },
      { keyword: 'schmand', category: 'Dairy' },
      { keyword: 'mozarella', category: 'Dairy' },
      { keyword: 'old amsterdam', category: 'Dairy' },
      { keyword: 'lesbos feta', category: 'Dairy' },
      { keyword: 'griech. hirtenka', category: 'Dairy' },
      { keyword: 'creme fraiche', category: 'Dairy' },
      { keyword: 'fr. jog. natur 1,5', category: 'Dairy' },
      // Meat
      { keyword: 'fleisch', category: 'Meat' },
      { keyword: 'wurst', category: 'Meat' },
      { keyword: 'rostbratwurst', category: 'Meat' },
      { keyword: 'rostbratwuerste', category: 'Meat' },
      { keyword: 'schinken', category: 'Meat' },
      { keyword: 'hähnchen', category: 'Meat' },
      { keyword: 'hae-schenkel', category: 'Meat' },
      { keyword: 'schenkel', category: 'Meat' },
      { keyword: 'rind', category: 'Meat' },
      { keyword: 'schwein', category: 'Meat' },
      { keyword: 'fisch', category: 'Meat' },
      { keyword: 'lachs', category: 'Meat' },
      { keyword: 'thunfisch', category: 'Meat' },
      { keyword: 'salami', category: 'Meat' },
      { keyword: 'spiessbraten', category: 'Meat' },
      { keyword: 'spiess', category: 'Meat' }, // Common abbreviation
      { keyword: 'spieß', category: 'Meat' }, // Alternative spelling
      { keyword: 'bacon in streif', category: 'Meat' },
      // Bakery
      { keyword: 'brot', category: 'Bakery' },
      { keyword: 'brötchen', category: 'Bakery' },
      { keyword: 'croissant', category: 'Bakery' },
      { keyword: 'buttercroissant', category: 'Bakery' },
      { keyword: 'kuchen', category: 'Bakery' },
      { keyword: 'gebäck', category: 'Bakery' },
      { keyword: 'gebaeck', category: 'Bakery' }, // Alternative spelling without umlaut
      { keyword: 'toast', category: 'Bakery' },
      { keyword: 'brezel', category: 'Bakery' },
      { keyword: 'donut', category: 'Bakery' },
      { keyword: 'pastel', category: 'Bakery' },
      { keyword: 'nata', category: 'Bakery' }, // For Pastel de Nata
      { keyword: 'butterspr', category: 'Bakery' },
      { keyword: 'spritz', category: 'Bakery' }, // For Butter Spritz cookies
      { keyword: 'anno 1688', category: 'Bakery' },
      { keyword: 'anno 1688 rustik', category: 'Bakery' },
      { keyword: 'flammkuchenteig', category: 'Bakery' },
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
      { keyword: 'schoko', category: 'Snacks' },
      { keyword: 'schokoladen', category: 'Snacks' }, // Common variant
      { keyword: 'keks', category: 'Snacks' },
      { keyword: 'süßigkeit', category: 'Snacks' },
      { keyword: 'suessigkeit', category: 'Snacks' }, // Alternative spelling without umlaut
      { keyword: 'bonbon', category: 'Snacks' },
      { keyword: 'gummibär', category: 'Snacks' },
      { keyword: 'gummibaer', category: 'Snacks' }, // Alternative spelling without umlaut
      { keyword: 'riegel', category: 'Snacks' },
      { keyword: 'popcorn', category: 'Snacks' },
      { keyword: 'cracker', category: 'Snacks' },
      { keyword: 'miluna', category: 'Snacks' },
      { keyword: 'negrom', category: 'Snacks' }, // For Miluna Negrom products
      { keyword: 'spekulatius', category: 'Snacks' },
      { keyword: 'giotto', category: 'Snacks' },
      { keyword: 'giotto haselnuss', category: 'Snacks' },
      // Sweets
      { keyword: 'süß', category: 'Sweets' },
      { keyword: 'bonbon', category: 'Sweets' },
      { keyword: 'keks', category: 'Sweets' },
      { keyword: 'cookie', category: 'Sweets' },
      { keyword: 'schokolade', category: 'Sweets' },
      // Oils
      { keyword: 'öl', category: 'Oils' },
      { keyword: 'essig', category: 'Oils' },
      { keyword: 'dressing', category: 'Oils' },
      { keyword: 'olivenöl', category: 'Oils' },
      { keyword: 'mayonnaise', category: 'Oils' },
      { keyword: 'deli. mayonnaise', category: 'Oils' },
    ]);
  }
});