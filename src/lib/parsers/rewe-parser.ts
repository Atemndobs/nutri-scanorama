import type { CategoryName } from '@/types/categories';
import { db } from '@/lib/db';

interface ParsedReweItem {
  name: string;
  quantity?: number;
  pricePerUnit?: number;
  totalPrice: number;
  taxRate: string;
  category: CategoryName;
}

interface ParsedReweReceipt {
  storeName: string;
  storeAddress: string;
  date: Date;
  items: ParsedReweItem[];
  totalAmount: number;
  taxDetails: {
    taxRateA: { rate: number; net: number; tax: number; gross: number; };
    taxRateB: { rate: number; net: number; tax: number; gross: number; };
  };
}

async function determineCategory(itemName: string): Promise<CategoryName> {
  return db.determineCategory(itemName);
}

async function incrementCategoryCount(category: CategoryName) {
  await db.incrementCategoryCount(category);
}

export async function parseReweReceipt(text: string): Promise<ParsedReweReceipt> {
  // Split text into lines and remove empty lines
  const lines = text.split('\n').filter(line => line.trim() !== '');
  
  // Initialize receipt data
  const receipt: ParsedReweReceipt = {
    storeName: 'REWE',
    storeAddress: '',
    date: new Date(),
    items: [],
    totalAmount: 0,
    taxDetails: {
      taxRateA: { rate: 19, net: 0, tax: 0, gross: 0 },
      taxRateB: { rate: 7, net: 0, tax: 0, gross: 0 }
    }
  };

  // Parse store address (usually first few lines)
  const addressLines = [];
  let currentLine = 0;
  
  // Find store address until we hit UID or EUR
  while (currentLine < lines.length && 
         !lines[currentLine].includes('UID') && 
         !lines[currentLine].includes('EUR')) {
    if (lines[currentLine].trim() !== '') {
      addressLines.push(lines[currentLine].trim());
    }
    currentLine++;
  }
  
  receipt.storeAddress = addressLines.join(', ');

  // Parse items
  let parsingItems = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) continue;

    // Start parsing items after EUR line
    if (line.includes('EUR')) {
      parsingItems = true;
      continue;
    }

    // Stop parsing items when we hit the tax section
    if (line.includes('Steuer') || line.includes('Geg.')) {
      parsingItems = false;
    }

    if (parsingItems) {
      // Skip lines that are clearly not items
      if (line.startsWith('|') || line.startsWith('>') || line.includes('E-Bon')) {
        continue;
      }

      // Match item pattern: name followed by price and tax rate
      // More flexible pattern to handle various formats
      const itemMatch = line.match(/^.*?(\d+[,\.]\d+)\s*([AB])\s*$/);
      if (itemMatch) {
        try {
          const [fullLine, priceStr, taxRate] = itemMatch;
          // Extract name by removing the price and tax rate from the end
          let name = fullLine.substring(0, fullLine.lastIndexOf(priceStr)).trim();
          let quantity: number | undefined;
          let pricePerUnit: number | undefined;

          // Check for quantity pattern (e.g., "0,486 kg x 3,98 EUR/kg")
          const quantityMatch = name.match(/(\d+,\d+)\s*kg\s*x\s*(\d+,\d+)\s*EUR\/kg/);
          if (quantityMatch) {
            quantity = parseFloat(quantityMatch[1].replace(',', '.'));
            pricePerUnit = parseFloat(quantityMatch[2].replace(',', '.'));
            // Remove the quantity part from the name
            name = name.substring(0, name.indexOf(quantityMatch[0])).trim();
          }

          const price = parseFloat(priceStr.replace(',', '.'));
          
          // Determine category using our new food-focused system
          console.debug('[ReweParser] Determining category for item:', name);
          const category = await db.determineCategory(name);
          console.debug('[ReweParser] Category determined:', { item: name, category });

          receipt.items.push({
            name,
            quantity,
            pricePerUnit,
            totalPrice: price,
            taxRate,
            category
          });

          // Update tax details
          if (taxRate === 'A') {
            receipt.taxDetails.taxRateA.gross += price;
          } else {
            receipt.taxDetails.taxRateB.gross += price;
          }

          // Increment category count
          await incrementCategoryCount(category);
        } catch (error) {
          console.error('Error processing item:', line, error);
          continue; // Skip this item and continue with the next one
        }
      }
    }

    // Parse total amount from Gesamtbetrag line
    if (line.includes('Gesantbetrag') || line.includes('Gesamtbetrag')) {
      const amounts = line.match(/(\d+[.,]\d+)/g);
      if (amounts && amounts.length >= 3) {
        // Gesamtbetrag format is: net tax gross
        // We want the gross amount (last number)
        const grossAmount = amounts[amounts.length - 1];
        receipt.totalAmount = parseFloat(grossAmount.replace(',', '.'));
      }
    }

    // Parse tax details
    if (line.includes('A= 19,0%')) {
      const values = line.match(/(\d+,\d+)/g);
      if (values && values.length >= 3) {
        receipt.taxDetails.taxRateA = {
          rate: 19,
          net: parseFloat(values[0].replace(',', '.')),
          tax: parseFloat(values[1].replace(',', '.')),
          gross: parseFloat(values[2].replace(',', '.'))
        };
      }
    }

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

  // If total amount wasn't found in Gesamtbetrag line, calculate from tax details
  if (receipt.totalAmount === 0) {
    const taxATotal = receipt.taxDetails.taxRateA.gross || 0;
    const taxBTotal = receipt.taxDetails.taxRateB.gross || 0;
    receipt.totalAmount = taxATotal + taxBTotal;
  }

  return receipt;
};