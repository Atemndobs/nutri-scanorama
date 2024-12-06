import { db } from './db';

interface PendingSync {
  type: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: number;
}

class SyncManager {
  private pendingChanges: PendingSync[] = [];

  constructor() {
    this.setupEventListeners();
    this.loadPendingChanges();
  }

  private async loadPendingChanges() {
    // Load pending changes from IndexedDB
    const storedChanges = await db.table('syncQueue').toArray();
    this.pendingChanges = storedChanges;
  }

  private setupEventListeners() {
    window.addEventListener('sync-data', async () => {
      await this.syncPendingChanges();
    });
  }

  async addChange(change: Omit<PendingSync, 'timestamp'>) {
    const syncItem: PendingSync = {
      ...change,
      timestamp: Date.now(),
    };

    // Store in IndexedDB
    await db.table('syncQueue').add(syncItem);
    this.pendingChanges.push(syncItem);
  }

  private async syncPendingChanges() {
    if (this.pendingChanges.length === 0) return;

    // Sort by timestamp
    const sortedChanges = [...this.pendingChanges].sort((a, b) => a.timestamp - b.timestamp);

    for (const change of sortedChanges) {
      try {
        // Here you would implement the actual sync logic with your backend
        // For now, we'll just remove the change from the queue
        await db.table('syncQueue').where('timestamp').equals(change.timestamp).delete();
        
        // Remove from pending changes
        const index = this.pendingChanges.findIndex(c => c.timestamp === change.timestamp);
        if (index > -1) {
          this.pendingChanges.splice(index, 1);
        }
      } catch (error) {
        console.error('Failed to sync change:', error);
        // Keep the change in the queue to try again later
      }
    }
  }
}

export const syncManager = new SyncManager();
