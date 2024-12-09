import { validateAndCalculateTotal, extractCommonDate, cleanPrice } from './receipt-utils';
import { ReceiptValidationError } from './errors';

interface OliverFrankReceiptItem {
  name: string;
  quantity?: number;
  pricePerUnit?: number;
  totalPrice: number;
  taxRate: "B"; // Oliver Frank seems to only use B = 7% tax rate
}

interface ParsedOliverFrankReceipt {
  storeName: string;
  storeAddress: string;
  date: Date;
  items: OliverFrankReceiptItem[];
  totalAmount: number;
  taxDetails: {
    taxRateB: { rate: number; net: number; tax: number; gross: number; };
  };
}

export const parseOliverFrankReceipt = async (text: string, receiptId: number): Promise<ParsedOliverFrankReceipt> => {
  // Split text into lines and remove empty lines
  const lines = text.split('\n').filter(line => line.trim() !== '');
  
  // Initialize receipt data
  const receipt: ParsedOliverFrankReceipt = {
    storeName: 'Nahkauf', // Updated store name
    storeAddress: '',
    date: extractCommonDate(lines) || new Date(),
    items: [],
    totalAmount: 0,
    taxDetails: {
      taxRateB: { rate: 7, net: 0, tax: 0, gross: 0 }
    }
  };

  // Parse store address (usually first few lines)
  const addressLines = [];
  let currentLine = 0;
  
  // Find store address until we hit Tel.
  while (currentLine < lines.length && !lines[currentLine].includes('Tel.')) {
    if (lines[currentLine].trim() !== '') {
      const cleanedLine = lines[currentLine]
        .replace('_', '') // Remove underscores
        .trim();
      if (cleanedLine) {
        addressLines.push(cleanedLine);
      }
    }
    currentLine++;
  }
  receipt.storeAddress = addressLines.join(', ');

  let calculatedTotal = 0; // Initialize calculated total

  // Parse items
  let parsingItems = true;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines or lines with underscores
    if (!line || line === '_') continue;

    // Stop parsing items when we hit the SUMME or tax section
    if (line.includes('SUMME') || line.includes('Steuer %')) {
      parsingItems = false;
      continue;
    }

    if (parsingItems && !line.includes('Tel.')) {
      // Adjusted item matching regex to accommodate new receipt format
      const itemMatch = line.match(/^(.+?)\s+(\d+,\d{2})\s*([B])?$/);
      if (itemMatch) {
        const [, rawName, priceStr] = itemMatch;
        let name = rawName.trim();

        // Clean up common OCR artifacts
        name = name
          .replace(/[|\u003e\u00A9_]/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        const item: OliverFrankReceiptItem = {
          name,
          totalPrice: cleanPrice(priceStr),
          taxRate: 'B'
        };

        receipt.items.push(item);
        calculatedTotal += item.totalPrice; // Add to calculated total
      } else if (line.match(/^[A-Z]/)) {
        // Handle items without price (continuation from previous line or special items)
        const lastItem = receipt.items[receipt.items.length - 1];
        if (lastItem) {
          lastItem.name = `${lastItem.name} ${line}`.trim();
        }
      } else {
        // Additional logging for uncategorized items
        if (!itemMatch && parsingItems) {
          console.warn(`Uncategorized line: ${line}`);
        }
      }
    }

    // Updated total amount parsing to match new format
    if (line.includes('Gesamtbetrag')) {
      const totalMatch = line.match(/(\d+,\d+)/);
      if (totalMatch) {
        receipt.totalAmount = parseFloat(totalMatch[1].replace(',', '.'));
      }
    }
  }

  // Use fallback total if parsing fails
  if (receipt.totalAmount === 0) {
    receipt.totalAmount = calculatedTotal;
  }

  // Validate receipt has required data
  if (!receipt.items.length) {
    throw new ReceiptValidationError('No valid items found in receipt');
  }

  return receipt;
};
