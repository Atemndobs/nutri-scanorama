import { ParsedItem } from '@/types/receipt-types';
import { CategoryName } from '@/types/categories';

const VALID_CATEGORIES = [
  'Fruits',
  'Vegetables',
  'Dairy',
  'Meat',
  'Bakery',
  'Beverages',
  'Snacks',
  'Cereals',
  'Sweets',
  'Oils',
  'Other'
];

// Common location names and non-food terms to filter out
const EXCLUDED_TERMS = [
  'duesseldorf',
  'düsseldorf',
  'berlin',
  'hamburg',
  'munich',
  'köln',
  'frankfurt',
  'stuttgart',
  'essen',
  'dortmund',
  'bremen',
  'dresden',
  'leipzig',
  'hannover',
  'nürnberg',
  'total',
  'summe',
  'zwischensumme',
  'mwst',
  'bar',
  'karte',
  'zahlung',
  'kunden',
  'beleg',
  'rechnung',
  'quittung',
  'bon',
  'datum',
  'uhrzeit',
  'filiale',
  'markt',
  'kasse',
  'nr'
];

function extractPrice(priceStr: string): number {
  try {
    // Remove any non-numeric characters except . and ,
    let cleaned = priceStr.replace(/[^0-9.,]/g, '').replace(',', '.');
    
    // If the price is embedded in the name (like "Bio-Obst-Sortiment 2,79")
    if (priceStr.includes(' ')) {
      const parts = priceStr.split(' ');
      const lastPart = parts[parts.length - 1];
      if (/[0-9]/.test(lastPart)) {
        cleaned = lastPart.replace(/[^0-9.,]/g, '').replace(',', '.');
      }
    }
    
    const price = parseFloat(cleaned);
    
    // Validate the price is reasonable (between 0.01 and 1000)
    if (price > 0 && price < 1000) {
      return price;
    }
    
    // If price seems too high, try dividing by 100 (common OCR error)
    if (price >= 1000) {
      const adjustedPrice = price / 100;
      if (adjustedPrice > 0 && adjustedPrice < 1000) {
        return adjustedPrice;
      }
    }
    
    return NaN;
  } catch {
    return NaN;
  }
}

function cleanupName(name: string): string {
  // Remove any trailing price or numbers
  let cleaned = name.replace(/\s+[\d.,]+[€]?$/, '').trim();
  
  // Convert to lowercase for comparison
  const lowercased = cleaned.toLowerCase();
  
  // Check if the name contains any excluded terms
  if (EXCLUDED_TERMS.some(term => lowercased.includes(term))) {
    return ''; // Return empty string to filter out this item
  }
  
  return cleaned;
}

/**
 * Extract items from the receipt text
 * @param text The receipt text to parse
 * @returns Array of parsed items with name, category, and price
 */
export function extractItemsFromText(text: string): Array<{ name: string; price: number; category?: CategoryName }> {
  try {
    // Parse the markdown table format into JSON
    const lines = text.split('\n').filter(line => line.trim() && !line.includes('---'));
    const headers = lines[0].split('|').map(h => h.trim().toLowerCase());
    
    if (!headers.includes('name') || !headers.includes('category') || !headers.includes('price')) {
      console.error('[Parser] Missing required columns in table headers');
      return [];
    }

    const items = lines.slice(1).map(line => {
      const values = line.split('|').map(v => v.trim());
      const item: any = {};
      
      headers.forEach((header, index) => {
        if (header === 'name') {
          item.name = cleanupName(values[index]);
        }
        else if (header === 'category') {
          const category = values[index];
          item.category = VALID_CATEGORIES.includes(category) ? category : 'Other';
        }
        else if (header === 'price') {
          item.price = extractPrice(values[index]);
        }
      });
      
      return item;
    });

    // Filter out invalid items
    const validItems = items.filter(item => 
      item.name && 
      item.name.trim().length > 0 &&
      !EXCLUDED_TERMS.some(term => item.name.toLowerCase().includes(term)) &&
      !isNaN(item.price) &&
      item.category &&
      item.price > 0 && 
      item.price < 1000
    );

    console.log('[Parser] Valid items:', validItems);
    return validItems;
  } catch (error) {
    console.error('[Parser] Failed to parse response as markdown table:', error);
    return [];
  }
}
