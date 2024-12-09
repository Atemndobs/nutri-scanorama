import { ParsedItem } from '@/types/receipt-types';
import { CategoryName } from '@/types/categories';
import { extractItemsFromText } from './parsers/default-parser';

const API_URL = import.meta.env.VITE_LMSTUDIO_BASE_URL;

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
  fast: import.meta.env.VITE_AI_FAST_MODEL_LMSTUDIO,
  precise: import.meta.env.VITE_AI_PRECISE_MODEL_LMSTUDIO
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

interface ResponseData {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  metadata: {
    storeName: string | null;
    storeAddress: string | null;
    date: string | null;
    totalAmount: number | null;
  };
}

class LMStudioService {
  private readonly apiUrl: string;
  private model: string;

  constructor() {
    this.apiUrl = API_URL;
    this.model = MODELS.fast; // Default to fast model
  }

  setModel(type: ModelType) {
    this.model = MODELS[type];
    console.log(`[LMSTUDIO] Switched to ${type} model:`, this.model);
  }

  async processReceipt(receiptText: string, systemPrompt: string): Promise<ProcessedReceipt> {
    try {
      console.log('[LMStudio] Processing receipt with:', {
        textLength: receiptText.length,
        promptLength: systemPrompt.length,
        model: this.model,
        url: this.apiUrl
      });

      const requestBody = {
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: receiptText }
        ],
        temperature: 0.1
      };

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[LMStudio] API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`LMStudio API Error: ${response.status}`);
      }

      const data = await response.json();
      console.log('[LMStudio] Raw response:', data);

      const responseText = data.choices[0].message.content.trim();
      console.log('[LMStudio] Extracted text:', responseText);

      const items = extractItemsFromText(responseText);
      console.log('[LMStudio] Parsed items:', items);

      return { items } as ProcessedReceipt;
    } catch (error) {
      console.error('[LMStudio] Error:', error);
      throw error;
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
      console.error('[LMSTUDIO] Error processing categories:', error);
      return [];
    }
  }
}

export const lmstudioService = new LMStudioService();
export default lmstudioService;