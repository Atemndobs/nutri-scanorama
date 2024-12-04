import Dexie, { Table } from 'dexie';

export interface Receipt {
  id?: number;
  storeName: string;
  imageData: string;
  uploadDate: Date;
  processed: boolean;
}

export class NutriScanDB extends Dexie {
  receipts!: Table<Receipt>;

  constructor() {
    super('nutriscan');
    this.version(1).stores({
      receipts: '++id, storeName, uploadDate, processed'
    });
  }
}

export const db = new NutriScanDB();