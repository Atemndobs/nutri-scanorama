import Dexie, { Table, Transaction } from 'dexie';
import type { CategoryName } from '../types/categories';
import { normalizeKeyword } from './db/categoryMappings';
import { ImageService } from './image-service';

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
  imageUrl?: string;
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

export interface ReceiptImage {
  id?: number;
  receiptId: number;
  image?: Blob;        // Keep for backward compatibility
  thumbnail: Blob;     // Small version for icon
  fullsize: Blob;      // High quality version for viewing
  mimeType: string;
  size: number;
  createdAt: Date;
}

interface NutriScanTransaction {
  receipts: Table<Receipt>;
  items: Table<ReceiptItem>;
  categories: Table<Category>;
  categoryMappings: Table<CategoryMapping>;
  syncQueue: Table<SyncQueueItem>;
  receiptImages: Table<ReceiptImage>;
}

export interface SyncQueueItem {
  id?: number;
  type: 'create' | 'update' | 'delete';
  table: keyof NutriScanTransaction;
  data: Receipt | ReceiptItem | Category | CategoryMapping | SyncQueueItem | ReceiptImage;
  timestamp: number;
  processed?: boolean;
}

export class NutriScanDB extends Dexie {
  receipts!: Table<Receipt>;
  items!: Table<ReceiptItem>;
  categories!: Table<Category>;
  categoryMappings!: Table<CategoryMapping>;
  syncQueue!: Table<SyncQueueItem>;
  receiptImages!: Table<ReceiptImage>;

  constructor() {
    super('nutriscan');
    this.version(10).stores({
      receipts: '++id, storeName, storeAddress, uploadDate, purchaseDate, processed, totalAmount, discrepancyDetected',
      items: '++id, receiptId, category, name, taxRate, price, quantity, pricePerUnit',
      categories: '++id, name, itemCount, color',
      categoryMappings: '++id, keyword, category',
      syncQueue: '++id, type, table, timestamp, processed',
      receiptImages: '++id, receiptId, thumbnail, fullsize, mimeType, size, createdAt'
    }).upgrade(async (tx) => {
      const nutriScanTx = tx as unknown as NutriScanTransaction;
      // Migrate existing images to new format
      const images = await nutriScanTx.receiptImages.toArray();
      for (const image of images) {
        if (image.image && (!image.thumbnail || !image.fullsize)) {
          console.log(' Migrating image:', image.id);
          // Use the existing image as fullsize and create a smaller thumbnail
          await nutriScanTx.receiptImages.update(image.id!, {
            thumbnail: image.image,  // Temporarily use original as thumbnail
            fullsize: image.image,   // Use original as fullsize
            image: undefined         // Clear old field
          });
          console.log(' Migrated image:', image.id);
        }
      }
    });

    this.version(9).stores({
      receipts: '++id, storeName, storeAddress, uploadDate, purchaseDate, processed, totalAmount, discrepancyDetected',
      items: '++id, receiptId, category, name, taxRate, price, quantity, pricePerUnit',
      categories: '++id, name, itemCount, color',
      categoryMappings: '++id, keyword, category',
      syncQueue: '++id, type, table, timestamp, processed',
      receiptImages: '++id, receiptId, createdAt'
    }).upgrade(async (tx) => {
      const nutriScanTx = tx as unknown as NutriScanTransaction;
      // Migration: Convert existing imageData to optimized images
      const receipts = await nutriScanTx.receipts.toArray();
      for (const receipt of receipts) {
        // Use type assertion for legacy receipt format
        const legacyReceipt = receipt as { imageData?: string } & Receipt;
        if (legacyReceipt.imageData) {
          try {
            // Convert base64 to blob
            const response = await fetch(legacyReceipt.imageData);
            const blob = await response.blob();
            
            // Process and store the image
            const imageService = ImageService.getInstance();
            await imageService.storeReceiptImage(receipt.id!, new File([blob], 'receipt.jpg'));
            
            // Update the receipt to remove imageData
            // await nutriScanTx.receipts.update(receipt.id!, {
            //   imageData: undefined
            // });
          } catch (error) {
            console.error('Failed to migrate receipt image:', error);
          }
        }
      }
    });

    this.version(8).stores({
      receipts: '++id, storeName, storeAddress, uploadDate, purchaseDate, processed, totalAmount, discrepancyDetected',
      items: '++id, receiptId, category, name, taxRate, price, quantity, pricePerUnit',
      categories: '++id, name, itemCount, color',
      categoryMappings: '++id, keyword, category',
      syncQueue: '++id, type, table, timestamp, processed'
    });

    this.version(7).upgrade((tx) => {
      const nutriScanTx = tx as unknown as NutriScanTransaction;
      nutriScanTx.receipts.toCollection().modify(receipt => {
        if (!receipt.text) receipt.text = '';
        if (typeof receipt.discrepancyDetected === 'undefined') {
          receipt.discrepancyDetected = false;
        }
      });
    });

    this.version(6).upgrade((tx) => {
      const nutriScanTx = tx as unknown as NutriScanTransaction;
      return nutriScanTx.receipts.toCollection().modify(receipt => {
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

    this.version(6).upgrade(async (tx) => {
      const nutriScanTx = tx as unknown as NutriScanTransaction;
      // Update items that should be in Cereals category
      await nutriScanTx.items.toCollection().modify(item => {
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
    await this.transaction('rw', [this.receipts, this.items, this.categories, this.categoryMappings, this.syncQueue, this.receiptImages], async () => {
      await this.receipts.clear();
      await this.items.clear();
      
      // Reset category counts instead of clearing
      await this.categories.toCollection().modify(category => {
        category.itemCount = 0;
      });

      // Keep category mappings intact
      // await this.categoryMappings.clear();
      await this.syncQueue.clear();
      await this.receiptImages.clear();
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
    await this.transaction('rw', [this.receipts, this.items, this.categories, this.receiptImages], async function (this: NutriScanDB) {
      // Get all items for this receipt
      const items = await this.items.where('receiptId').equals(receiptId).toArray();
      
      // Update category counts
      const categoryUpdates: Record<string, number> = {};
      items.forEach(item => {
        if (item.category) {
          categoryUpdates[item.category] = (categoryUpdates[item.category] || 0) + item.quantity!;
        }
      });
      // Apply category updates
      for (const [category, count] of Object.entries(categoryUpdates)) {
        await this.categories.where('name').equals(category).modify(cat => {
          cat.itemCount -= count;
        });
      }
      // Delete all items associated with this receipt
      await this.items.where('receiptId').equals(receiptId).delete();
      // Delete the receipt itself
      await this.receipts.delete(receiptId);
    });
  }
}
