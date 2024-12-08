import { ReceiptValidationError } from './errors';
import { ParsedReceipt } from '@/types/receipt-types';
import { CategoryName } from "@/types/categories";

export interface ExtractedItem {
  name: string;
  category: CategoryName;
  price: number;
}

export async function defaultReceiptParser(text: string, receiptId: number): Promise<ParsedReceipt> {
    const receipt: ParsedReceipt = {
        storeName: 'Unknown Store',
        storeAddress: 'Unknown Address',
        items: [],
        totalAmount: 0,
        date: new Date(),
        taxDetails: { taxRateA: { tax: 0, net: 0, gross: 0 }, taxRateB: { tax: 0, net: 0, gross: 0 } }
    };

    // Extract items from the receipt text
    const itemsExtracted = extractItemsFromText(text);
    if (itemsExtracted.length === 0) {
        throw new ReceiptValidationError('No valid items found in receipt.');
    }

    // Prompt user for missing information
    receipt.storeName = prompt('Store not recognized. Please enter the store name:') || 'Unknown Store';
    receipt.storeAddress = prompt('Please enter the store address:') || 'Unknown Address';

    // Add extracted items to receipt
    receipt.items = itemsExtracted;

    return receipt;
}

/**
 * Extracts items from a given receipt text.
 * 
 * @param text The receipt text to extract items from.
 * @returns An array of extracted items.
 */
export function extractItemsFromText(text: string): ExtractedItem[] {
  try {
    // Split the text into lines and remove empty lines and separator lines
    const lines = text.split('\n').filter(line => 
      line.trim() && !line.includes('---') && !line.toLowerCase().includes('category') && !line.toLowerCase().includes('price')
    );

    return lines.map(line => {
      const parts = line.split('|').map(part => part.trim());
      
      // Skip if we don't have exactly 3 parts (name, category, price)
      if (parts.length !== 3) {
        console.warn('[Parser] Invalid line format:', line);
        return null;
      }

      const [name, category, priceStr] = parts;

      // Skip the header row or total row
      if (name.toLowerCase() === 'name' || name.toLowerCase() === 'total') {
        return null;
      }

      // Parse the price, removing any currency symbols
      const price = parseFloat(priceStr.replace(/[$€£¥]/g, ''));
      if (isNaN(price)) {
        console.warn('[Parser] Invalid price format:', priceStr);
        return null;
      }

      return {
        name,
        category: category as CategoryName,
        price
      };
    }).filter((item): item is ExtractedItem => item !== null);
  } catch (error) {
    console.error('[Parser] Error parsing text:', error);
    return [];
  }
}