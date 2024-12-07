import type { CategoryName } from '@/types/categories';
import { db } from '@/lib/db';
import { validateAndCalculateTotal, extractCommonDate, cleanPrice } from './receipt-utils';
import { ReceiptValidationError } from './errors';
import {ParsedReceipt as ParsedReweReceipt} from '@/types/receipt-types'

async function determineCategory(itemName: string): Promise<CategoryName> {
  return db.determineCategory(itemName);
}

async function incrementCategoryCount(category: CategoryName) {
  await db.incrementCategoryCount(category);
}

export function extractStoreInfo(lines: string[]): { storeName: string; storeAddress: string } {
  const storeInfo = {
    storeName: 'Other',  // Default to 'Other'
    storeAddress: ''
  };

  // Check if REWE appears anywhere in the receipt
  const isReweReceipt = lines.some(line => 
    line.toUpperCase().includes('REWE') || 
    line.replace(/\s/g, '').toUpperCase().includes('REWE')  // Check also without spaces
  );

  // Removed store name assignment logic from the parser
  if (isReweReceipt) {
    storeInfo.storeName = 'REWE';
  }

  // Look for address in first 10 lines (typical position)
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i].trim();
    // Match street address pattern (street name followed by numbers)
    if (line.match(/^[A-Za-zäöüßÄÖÜ\s.-]+\s+\d+(-\d+)?$/)) {
      storeInfo.storeAddress = line;
      // Next line is usually postal code and city
      if (i + 1 < lines.length) {
        storeInfo.storeAddress += '\n' + lines[i + 1].trim();
      }
      break;
    }
  }

  return storeInfo;
}

export async function parseReweReceipt(text: string, receiptId: number): Promise<ParsedReweReceipt> {
  try {
    // Split text into lines and remove empty lines
    const lines = text.split('\n').filter(line => line.trim() !== '');
    
    // Extract store information and purchase date
    const { storeName, storeAddress } = extractStoreInfo(lines);
    const purchaseDate = extractCommonDate(lines) || new Date();

    // If store is Other and no valid address found, allow processing to continue
    // if (storeName === 'Other' && !storeAddress) {
    //   console.warn('Store is unknown and no valid address found.');
    //   storeName = prompt('Store not recognized. Please enter the store name:') || 'Unknown Store';
    //   storeAddress = prompt('Please enter the store address:') || '';

    //   storeName = 'Unknown Store';
    //   storeAddress =  '';
    // }

    // Initialize receipt data
    const receipt: ParsedReweReceipt = {
      storeName,
      storeAddress,
      date: purchaseDate,
      items: [],
      totalAmount: 0,
      taxDetails: {
        taxRateA: { rate: 19, net: 0, tax: 0, gross: 0 },
        taxRateB: { rate: 7, net: 0, tax: 0, gross: 0 }
      },
      discrepancyDetected: false
    };

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
        const itemMatch = line.match(/^.*?(\d+[,.]\d+)\s*([AB])\s*$/);
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

    // After parsing items, validate and calculate total
    try {
      const { total, method } = validateAndCalculateTotal(lines, receipt.items);
      receipt.totalAmount = total;
      
      // Update tax details based on total if we had to calculate it
      if (method === 'calculated') {
        // For REWE, we assume standard 19% VAT for simplification when calculating
        const netAmount = total / 1.19;
        receipt.taxDetails.taxRateA = {
          rate: 19,
          net: netAmount,
          tax: total - netAmount,
          gross: total
        };
        receipt.taxDetails.taxRateB = {
          rate: 7,
          net: 0,
          tax: 0,
          gross: 0
        };
      }
    } catch (error) {
      await db.deleteFailedScan(receiptId);
      if (error instanceof ReceiptValidationError) {
        throw error;
      }
      throw new ReceiptValidationError('Failed to process receipt data');
    }

    // Validate receipt has required data
    if (!receipt.items.length) {
      await db.deleteFailedScan(receiptId);
      throw new ReceiptValidationError('No valid items found in receipt');
    }

    return receipt;
  } catch (error) {
    await db.deleteFailedScan(receiptId);
    throw error;
  }
}