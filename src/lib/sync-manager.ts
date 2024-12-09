import { db, Receipt, ReceiptItem, Category, CategoryMapping, SyncQueueItem } from './db';

class SyncManager {
  private isProcessing: boolean = false;

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    window.addEventListener('sync-data', async () => {
      await this.processSyncQueue();
    });
  }

  async queueChanges(changes: Array<Omit<SyncQueueItem, 'id' | 'processed'>>) {
    try {
      // Add changes to sync queue
      await db.syncQueue.bulkAdd(
        changes.map(change => ({
          ...change,
          processed: false
        }))
      );

      // Process changes immediately
      for (const change of changes) {
        try {
          switch (change.type) {
            case 'create':
              if (change.table === 'receiptItems') {
                await db.items.bulkAdd(change.data);
              } else if (change.table === 'receipts') {
                await db.receipts.add(change.data);
              }
              break;
            
            case 'update':
              if (change.table === 'receiptItems') {
                await db.items.bulkPut(change.data);
              } else if (change.table === 'receipts') {
                const { id, ...updateData } = change.data;
                await db.receipts.update(id, updateData);
              }
              break;
            
            case 'delete':
              if (change.table === 'receiptItems') {
                const ids = Array.isArray(change.data) ? change.data : [change.data];
                await db.items.bulkDelete(ids);
              } else if (change.table === 'receipts') {
                await db.receipts.delete(change.data);
              }
              break;
          }
        } catch (error) {
          console.error(`[SyncManager] Error processing change:`, error);
          // Continue with next change
        }
      }
      
      // Clean up old processed items
      await this.cleanupProcessedItems();
      
    } catch (error) {
      console.error('[SyncManager] Error queueing changes:', error);
      throw error;
    }
  }

  private async cleanupProcessedItems() {
    try {
      // Clean up processed items older than 24 hours
      const yesterday = Date.now() - (24 * 60 * 60 * 1000);
      const oldItems = await db.syncQueue
        .where('processed')
        .equals(true)
        .filter(item => item.timestamp < yesterday)
        .toArray();
      
      if (oldItems.length > 0) {
        await db.syncQueue.bulkDelete(oldItems.map(item => item.id!));
      }
    } catch (error) {
      console.error('[SyncManager] Error cleaning up processed items:', error);
    }
  }

  async processSyncQueue() {
    if (this.isProcessing) {
      console.log('[SyncManager] Already processing queue');
      return;
    }

    try {
      this.isProcessing = true;
      
      // Get unprocessed items
      const pendingItems = await db.syncQueue
        .where('processed')
        .equals(false)
        .toArray();

      if (pendingItems.length === 0) {
        console.log('[SyncManager] No pending items to process');
        return;
      }

      console.log(`[SyncManager] Processing ${pendingItems.length} items`);

      for (const item of pendingItems) {
        try {
          switch (item.type) {
            case 'create':
              if (item.table === 'receiptItems') {
                await db.items.bulkAdd(item.data);
              }
              break;
            
            case 'update':
              if (item.table === 'receiptItems') {
                await db.items.bulkPut(item.data);
              }
              break;
            
            case 'delete':
              if (item.table === 'receiptItems') {
                const ids = Array.isArray(item.data) ? item.data : [item.data];
                await db.items.bulkDelete(ids);
              }
              break;
          }

          // Mark as processed
          await db.syncQueue.update(item.id!, { processed: true });
          
        } catch (error) {
          console.error(`[SyncManager] Error processing item ${item.id}:`, error);
          // Continue with next item
        }
      }

    } catch (error) {
      console.error('[SyncManager] Error processing sync queue:', error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }
}

export const syncManager = new SyncManager();
