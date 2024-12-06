import type { CategoryName } from '@/types/categories';
import { db } from '@/lib/db';

interface OliverFrankReceiptItem {
  name: string;
  quantity?: number;
  pricePerUnit?: number;
  totalPrice: number;
  category: CategoryName;
}

interface ParsedOliverFrankReceipt {
  storeName: string;
  storeAddress: string;
  date: Date;
  items: OliverFrankReceiptItem[];
  totalAmount: number;
}

export async function parseOliverFrankReceipt(text: string): Promise<ParsedOliverFrankReceipt> {
  // Split text into lines and remove empty lines
  const lines = text.split('\n').filter(line => line.trim() !== '');
  
  // Initialize receipt data
  const receipt: ParsedOliverFrankReceipt = {
    storeName: 'Oliver Frank',
    storeAddress: '',
    date: new Date(),
    items: [],
    totalAmount: 0
  };

  // Parse items
  let parsingItems = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) continue;

    // Start parsing items after the header section
    if (line.includes('EUR')) {
      parsingItems = true;
      continue;
    }

    // Stop parsing when we hit the totals section
    if (line.toLowerCase().includes('summe') || line.toLowerCase().includes('gesamt')) {
      parsingItems = false;
      
      // Try to extract total amount
      const totalMatch = line.match(/(\d+[.,]\d{2})/);
      if (totalMatch) {
        receipt.totalAmount = parseFloat(totalMatch[1].replace(',', '.'));
      }
    }

    if (parsingItems) {
      // Match price pattern at the end of the line
      const priceMatch = line.match(/(.*?)\s+(\d+[.,]\d{2})\s*$/);
      if (priceMatch) {
        const [, itemName, priceStr] = priceMatch;
        const price = parseFloat(priceStr.replace(',', '.'));
        
        try {
          const category = await db.determineCategory(itemName.trim());
          receipt.items.push({
            name: itemName.trim(),
            totalPrice: price,
            category
          });
        } catch (error) {
          console.error('Error processing item:', itemName, error);
          continue;
        }
      }
    }
  }

  // If total amount wasn't found, calculate from items
  if (receipt.totalAmount === 0) {
    receipt.totalAmount = receipt.items.reduce((sum, item) => sum + item.totalPrice, 0);
  }

  return receipt;
}