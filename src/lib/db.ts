import Dexie, { Table } from 'dexie';

export interface ReceiptItem {
  id?: number;
  name: string;
  category: string;
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
  name: string;
  icon: string;
  itemCount: number;
}

export class NutriScanDB extends Dexie {
  receipts!: Table<Receipt>;
  items!: Table<ReceiptItem>;
  categories!: Table<Category>;

  constructor() {
    super('nutriscan');
    this.version(2).stores({
      receipts: '++id, storeName, uploadDate, processed',
      items: '++id, receiptId, category, name',
      categories: '++id, name'
    });
  }

  async clearAllData() {
    await this.transaction('rw', this.receipts, this.items, this.categories, async () => {
      await this.receipts.clear();
      await this.items.clear();
      await this.categories.clear();
    });
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
    ]);
  }
});