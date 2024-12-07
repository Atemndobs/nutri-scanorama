import { Receipt, ReceiptItem, Category, CategoryMapping } from '../lib/db';

export interface SyncQueueItem {
  id?: number;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: Receipt | ReceiptItem | Category | CategoryMapping;
  timestamp: number;
}
