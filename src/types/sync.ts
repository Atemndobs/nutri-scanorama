export interface SyncQueueItem {
  id?: number;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: Receipt | ReceiptItem | Category | CategoryMapping;
  timestamp: number;
}
