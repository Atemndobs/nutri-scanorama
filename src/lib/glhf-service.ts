import { CategoryName } from '@/types/categories';
import { extractItemsFromText } from './parsers/new-parser';

const BASE_URL = import.meta.env.VITE_BASE_URL_GLHF;
const API_KEY = import.meta.env.VITE_API_KEY_GLHF;
const FAST_MODEL = import.meta.env.VITE_AI_FAST_MODEL_GLHF;
const PRECISE_MODEL = import.meta.env.VITE_AI_PRECISE_MODEL_GLHF;

export interface ProcessedReceipt {
  items: Array<{
    name: string;
    price: number;
    category?: CategoryName;
  }>;
  total?: number;
  date?: string;
}

export class GLHFService {
  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor(apiKey: string) {
    if (!BASE_URL) {
      throw new Error('GLHF base URL not configured');
    }
    if (!FAST_MODEL || !PRECISE_MODEL) {
      throw new Error('GLHF models not configured');
    }
    console.log('[GLHF] Initializing with:', {
      baseUrl: BASE_URL,
      fastModel: FAST_MODEL,
      preciseModel: PRECISE_MODEL
    });
    this.apiUrl = BASE_URL;
    this.apiKey = apiKey;
  }

  async processReceipt(receiptText: string, systemPrompt: string, usePreciseModel: boolean = false): Promise<ProcessedReceipt> {
    console.log('[GLHF] Processing receipt with:', {
      textLength: receiptText.length,
      promptLength: systemPrompt.length,
      baseUrl: this.apiUrl,
      model: usePreciseModel ? PRECISE_MODEL : FAST_MODEL
    });

    const body = {
      model: usePreciseModel ? PRECISE_MODEL : FAST_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: receiptText }
      ],
      temperature: 0.1
    };

    try {
      const response = await fetch(`${this.apiUrl}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[GLHF] API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`GLHF API Error: ${response.status} - ${errorText || response.statusText}`);
      }

      const data = await response.json();
      console.log('[GLHF] Raw API response:', data);

      const content = data.choices?.[0]?.message?.content || data.message?.content || data.content;
      if (!content) {
        throw new Error('No content in response');
      }

      const items = await extractItemsFromText(content);
      console.log('[GLHF] Extracted items:', items);

      return {
        items: items.map(item => ({
          name: item.name,
          price: item.price,
          category: item.category
        }))
      };
    } catch (error) {
      console.error('[GLHF] Error processing receipt:', error);
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
      const response = await fetch(`${this.apiUrl}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: FAST_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text }
          ],
          temperature: 0.1
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[GLHF] Category API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`GLHF Category API Error: ${response.status} - ${errorText || response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || data.message?.content || data.content;
      
      if (!content) {
        throw new Error('No content in category response');
      }

      return JSON.parse(content);
    } catch (error) {
      console.error('[GLHF] Error processing category text:', error);
      throw error;
    }
  }
}

export const glhfService = new GLHFService(API_KEY || '');
export default glhfService;
