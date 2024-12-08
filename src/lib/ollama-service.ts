import { ParsedItem } from '@/types/receipt-types';
import { CategoryName } from '@/types/categories';
import { extractItemsFromText } from './parsers/default-parser';

const API_URL = 'http://localhost:3002/api/v1/chat/completions';

interface OllamaResponse {
  items: Array<{
    name: string;
    category?: CategoryName;
    price: number;
    quantity?: number;
    pricePerUnit?: number;
    taxRate: string;
  }>;
}

interface OllamaApiResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

export type ModelType = 'fast' | 'precise';

const MODELS = {
  fast: 'meta-llama-3.2-1b',
  precise: 'qwen2.5-coder-32b-instruct'
} as const;

export class ProcessedReceipt {
  constructor(
    public storeName: string,
    public items: { name: string; category: string; price: number; }[],
    public totalAmount: number
  ) {}

  [Symbol.iterator]() {
    let index = 0;
    const items = this.items;
    return {
      next: () => {
        if (index < items.length) {
          return { value: items[index++], done: false };
        } else {
          return { done: true };
        }
      }
    };
  }
}

class OllamaService {
  private readonly apiUrl: string;
  private model: string;

  constructor() {
    this.apiUrl = API_URL;
    this.model = MODELS.fast; // Default to fast model
  }

  setModel(type: ModelType) {
    this.model = MODELS[type];
    console.log(`[OLLAMA] Switched to ${type} model:`, this.model);
  }

  async processReceipt(receiptText: string): Promise<ProcessedReceipt> {
    console.log('\n[OLLAMA] Starting receipt processing...');
    console.log('[OLLAMA] Receipt text length:', receiptText.length);
    console.log('[OLLAMA] First 100 chars of receipt:', receiptText.substring(0, 100));

    try {
      const itemsExtracted = extractItemsFromText(receiptText);
      console.log('[OLLAMA] Extracted items:', itemsExtracted);

      const systemPrompt = `You are a receipt parser that MUST return ONLY valid JSON, no other text.

IMPORTANT: DO NOT include any explanatory text. Return ONLY the JSON object.

Required JSON format:
{
  "items": [
    {
      "name": string,          // Clean item name
      "price": number,         // Price in EUR
      "quantity": number|null, // Quantity if found
      "unit": string|null,     // Unit (kg, g, piece)
      "pricePerUnit": number|null, // Price per unit
      "taxRate": string|null,  // Tax rate as string
      "category": string|null  // Product category
    }
  ],
  "metadata": {
    "storeName": string|null,
    "storeAddress": string|null,
    "date": string|null,      // ISO format
    "totalAmount": number|null
  }
}

Rules:
1. ONLY return the JSON object, no other text
2. Use null for missing data
3. Clean item names of codes
4. Convert prices to numbers
5. Format dates as YYYY-MM-DD`;

      const requestPayload = {
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: receiptText }
        ],
        temperature: 0.1, // Lower temperature for more consistent output
        max_tokens: -1,
        stream: false,
      };

      console.log('\n[OLLAMA] Sending request to LM Studio:');
      console.log('----------------------------------------');
      console.log('URL:', this.apiUrl);
      console.log('Model:', this.model);
      console.log('Payload:', JSON.stringify(requestPayload, null, 2));
      console.log('----------------------------------------');

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000); // 1 minute timeout

      try {
        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Origin': window.location.origin
          },
          body: JSON.stringify(requestPayload),
          mode: 'cors',
          credentials: 'omit'
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[OLLAMA] Server error:', {
            status: response.status,
            statusText: response.statusText,
            error: errorText
          });
          throw new Error(`HTTP error! status: ${response.status} - ${errorText || response.statusText}`);
        }

        const data = await response.json();

        console.log('\n[OLLAMA] Received response:');
        console.log('----------------------------------------');
        console.log('Status:', response.status);
        console.log('Headers:', Object.fromEntries(response.headers));
        console.log('Data:', JSON.stringify(data, null, 2));
        console.log('----------------------------------------');

        if (!data) {
          throw new Error('Empty response from LM Studio');
        }

        // Parse the response and convert it to ProcessedReceipt format
        const items = this.parseResponseToItems(data);
        const totalAmount = items.reduce((sum, item) => sum + item.price, 0);

        return new ProcessedReceipt('', items, totalAmount);
      } catch (error) {
        console.error('\n[OLLAMA] Error processing receipt:', error);
        if (error instanceof Error) {
          console.error('[OLLAMA] Error message:', error.message);
        }
        throw new Error('Failed to process receipt');
      }
    } catch (error) {
      console.error('\n[OLLAMA] Error processing receipt:', error);
      if (error instanceof Error) {
        console.error('[OLLAMA] Error message:', error.message);
      }
      throw new Error('Failed to process receipt');
    }
  }

  async processCategoryText(text: string): Promise<Array<{ keyword: string, category: CategoryName }>> {
    const systemPrompt = `You are a product categorizer. Given a list of product names or descriptions, return ONLY valid JSON with categorized items.
    
    IMPORTANT: You MUST ONLY use these exact categories:
    - Fruits
    - Vegetables
    - Dairy
    - Meat
    - Bakery
    - Beverages
    - Snacks
    - Cereals
    - Sweets
    - Oils
    - Other (use this if item doesn't fit in any other category)

    Guidelines:
    - Fruits: Fresh, dried, or processed fruits
    - Vegetables: Fresh, frozen, or canned vegetables
    - Dairy: Milk, cheese, yogurt, butter, cream
    - Meat: All meats, fish, and poultry
    - Bakery: Bread, pastries, cakes
    - Beverages: Drinks, water, juice, soda
    - Snacks: Chips, crackers, nuts
    - Cereals: Breakfast cereals, oats, muesli
    - Sweets: Candy, chocolate, desserts
    - Oils: Cooking oils, vinegar, dressings
    - Other: Items that don't fit above categories

    Required JSON format:
    {
      "items": [
        {
          "keyword": string,    // The product name or description
          "category": string    // MUST be one of the exact categories listed above
        }
      ]
    }`;

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text }
          ],
          stream: false
        })
      });

      const data = await response.json() as OllamaApiResponse;
      const jsonMatch = data.response.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.items;
    } catch (error) {
      console.error('[OLLAMA] Error processing categories:', error);
      return [];
    }
  }

  private parseResponseToItems(responseData: any): Array<{ name: string; category: string; price: number }> {
    try {
      // Extract content from the choices array
      const content = responseData.choices?.[0]?.message?.content;
      if (!content) {
        console.log('\n[OLLAMA] No content found in response');
        return [];
      }

      console.log('\n[OLLAMA] Parsing response content:', content);
      
      try {
        // Try to extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const jsonContent = jsonMatch ? jsonMatch[0] : content;
        
        // Try to parse the JSON
        const parsedData = JSON.parse(jsonContent);
        
        if (!parsedData.items || !Array.isArray(parsedData.items)) {
          console.error('[OLLAMA] Invalid response format: missing or invalid items array');
          return [];
        }

        // Map the items to our required format
        return parsedData.items
          .filter(item => 
            item && 
            typeof item === 'object' && 
            typeof item.name === 'string' && 
            typeof item.price === 'number'
          )
          .map(item => ({
            name: item.name.trim() || 'Unknown Item',
            category: item.category || 'Other',
            price: typeof item.price === 'number' ? Math.max(0, item.price) : 0,
            quantity: item.quantity || null,
            pricePerUnit: item.pricePerUnit || null,
            taxRate: item.taxRate || '0.19'
          }))
          .filter(item => 
            item.name !== 'Unknown Item' && 
            item.price > 0 && 
            !item.name.toLowerCase().includes('summe') && 
            !item.name.toLowerCase().includes('total')
          );

      } catch (jsonError) {
        console.error('[OLLAMA] Failed to parse JSON response:', jsonError);
        console.log('[OLLAMA] Raw content:', content);
        
        // Fallback to the old line-by-line parsing
        return this.fallbackParsing(content);
      }
    } catch (error) {
      console.error('[OLLAMA] Error parsing response:', error);
      return [];
    }
  }

  private fallbackParsing(content: string): Array<{ name: string; category: string; price: number }> {
    const items = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (!line.trim() || line.includes('Here are the shopping items')) {
        continue;
      }

      const cleanLine = line.replace(/^[-•*]\s*/, '').trim();
      if (!cleanLine) continue;

      const priceMatch = cleanLine.match(/^(.*?)\s*[-:]?\s*([\d,.]+)\s*(?:EUR|€)?/i);
      if (priceMatch) {
        const [_, name, priceStr] = priceMatch;
        const cleanName = name.replace(/\([^)]*\)/g, '').trim();
        const cleanPrice = parseFloat(priceStr.replace(',', '.').replace("'", ''));

        if (!isNaN(cleanPrice) && cleanName && !cleanName.toLowerCase().includes('summe')) {
          items.push({
            name: cleanName,
            category: 'Other',
            price: cleanPrice
          });
        }
      }
    }

    return items;
  }
}

export const ollamaService = new OllamaService();