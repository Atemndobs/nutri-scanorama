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
    storeName: 'Oliver Frank',
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
      // Clean up address lines
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
      // Match item pattern: name followed by price and tax rate
      // Format: NAME PRICE B
      const itemMatch = line.match(/^(.+?)\s+([\d,]+)\s*([B])\s*$/);
      if (itemMatch) {
        const [, rawName, priceStr, taxRate] = itemMatch;
        let name = rawName.trim();

        // Clean up common OCR artifacts
        name = name
          .replace(/[|>©_]/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        const item: OliverFrankReceiptItem = {
          name,
          totalPrice: cleanPrice(priceStr),
          taxRate: taxRate as "B"
        };

        receipt.items.push(item);
      } else if (line.match(/^[A-Z]/)) {
        // Handle items without price (continuation from previous line or special items)
        const lastItem = receipt.items[receipt.items.length - 1];
        if (lastItem) {
          lastItem.name = `${lastItem.name} ${line}`.trim();
        }
      }
    }

    // Parse total amount
    if (line.includes('Geg. VISA EUR')) {
      const totalMatch = line.match(/(\d+,\d+)/);
      if (totalMatch) {
        receipt.totalAmount = parseFloat(totalMatch[1].replace(',', '.'));
      }
    }

    // Parse tax details
    if (line.includes('B= 7,0%')) {
      const values = line.match(/(\d+,\d+)/g);
      if (values && values.length >= 3) {
        receipt.taxDetails.taxRateB = {
          rate: 7,
          net: parseFloat(values[0].replace(',', '.')),
          tax: parseFloat(values[1].replace(',', '.')),
          gross: parseFloat(values[2].replace(',', '.'))
        };
      }
    }
  }

  // After parsing all items, validate and calculate total
  try {
    const { total, method } = validateAndCalculateTotal(lines, receipt.items);
    receipt.totalAmount = total;

    // Update tax details based on total if we had to calculate it
    if (method === 'calculated') {
      const netAmount = total / 1.07; // Oliver Frank uses 7% VAT
      receipt.taxDetails.taxRateB = {
        rate: 7,
        net: netAmount,
        tax: total - netAmount,
        gross: total
      };
    }
  } catch (error) {
    if (error instanceof ReceiptValidationError) {
      throw error;
    }
    throw new ReceiptValidationError('Failed to process receipt data');
  }

  // Validate receipt has required data
  if (!receipt.items.length) {
    throw new ReceiptValidationError('No valid items found in receipt');
  }

  return receipt;
};
