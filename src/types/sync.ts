export interface SyncQueueItem {
  id?: number;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: number;
}
