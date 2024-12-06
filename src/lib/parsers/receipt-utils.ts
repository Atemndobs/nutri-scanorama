import { ReceiptValidationError } from './errors';

export interface ReceiptItem {
  name: string;
  totalPrice: number;
  quantity?: number;
  pricePerUnit?: number;
  taxRate: string;
}

export function validateAndCalculateTotal(
  lines: string[],
  items: ReceiptItem[],
): { total: number; method: 'explicit' | 'calculated' } {
  // Try to find explicit total with OCR error tolerance
  const totalPatterns = [
    // Common German total keywords with fuzzy matching
    /Gesam?[mn]?t\w*\s*(?:EUR|€)?\s*(\d+[.,]\d+)/i,  // Matches Gesamt, Gesammt, Gesant, etc.
    /Total\w*\s*(?:EUR|€)?\s*(\d+[.,]\d+)/i,
    /Summ?[ae]\w*\s*(?:EUR|€)?\s*(\d+[.,]\d+)/i,
    // Look for numbers after common payment methods
    /(?:VISA|EC|Geg\.)\s*(?:EUR|€)?\s*(\d+[.,]\d+)/i,
    // Look for tax total lines (usually the final amount)
    /(?:\d+[.,]\d+)\s+(?:\d+[.,]\d+)\s+(\d+[.,]\d+)\s*$/,  // Matches the last number in tax breakdown
    // General total amount pattern
    /(\d+[.,]\d+)\s*(?:EUR|€)?\s*$/
  ];

  // First pass: Look for exact total amount matches
  for (const line of lines) {
    const cleanLine = line.replace(/[|>©_]/g, '').trim();
    
    // Look for tax breakdown pattern first (most reliable)
    if (cleanLine.match(/(?:Steuer|tax|mwst)/i)) {
      const numbers = cleanLine.match(/\d+[.,]\d+/g);
      if (numbers && numbers.length >= 3) {
        const total = cleanPrice(numbers[numbers.length - 1]);
        if (total > 0) {
          return { total, method: 'explicit' };
        }
      }
    }

    // Try all total patterns
    for (const pattern of totalPatterns) {
      const match = cleanLine.match(pattern);
      if (match) {
        const total = cleanPrice(match[1]);
        if (total > 0) {
          // Validate total is reasonable (not more than 50% different from sum of items)
          const itemsTotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
          if (itemsTotal === 0 || (Math.abs(total - itemsTotal) / itemsTotal) <= 0.5) {
            return { total, method: 'explicit' };
          }
        }
      }
    }
  }

  // Second pass: Calculate from items if we have them
  if (items.length > 0) {
    const calculatedTotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    if (calculatedTotal > 0) {
      console.debug('Using calculated total:', calculatedTotal);
      return { total: calculatedTotal, method: 'calculated' };
    }
  }

  // If we have no items and no valid total, this is a failed scan
  if (items.length === 0) {
    throw new ReceiptValidationError('Extracted data contains no valid items');
  }

  throw new ReceiptValidationError('Unable to determine receipt total');
}

export function cleanPrice(priceStr: string): number {
  // Handle various price formats and OCR errors
  const cleaned = priceStr
    .replace(/[^\d,.-]/g, '')  // Remove all non-numeric chars except , . -
    .replace(/[,.](\d{1,2})$/, '.$1')  // Convert last comma/dot to decimal point
    .replace(/[,.-]/g, '');  // Remove any remaining separators
  
  const price = parseFloat(cleaned) / (cleaned.length > 2 ? 100 : 1);
  return isNaN(price) ? 0 : Math.round(price * 100) / 100;  // Round to 2 decimal places
}

export function extractCommonDate(lines: string[]): Date | null {
  const datePatterns = [
    /TSE-Start:\s*(\d{4}-\d{2}-\d{2})/,
    /(\d{2}[./-]\d{2}[./-]\d{4})/,
    /(\d{4}[./-]\d{2}[./-]\d{2})/
  ];

  for (const line of lines) {
    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match) {
        const dateStr = match[1];
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }
  }

  return null;
}
