import { CategoryName } from '@/types/categories';
import { ProxyManager } from './proxy-manager';
import { extractItemsFromText } from './parsers/new-parser';

const BASE_URL = import.meta.env.VITE_GLHF_CHAT_BASE_URL;
const API_KEY = import.meta.env.VITE_GLHF_CHAT_API_KEY;
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
  private readonly proxyManager: ProxyManager;

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
    this.proxyManager = new ProxyManager(BASE_URL, apiKey);
  }

  async processReceipt(receiptText: string, systemPrompt: string, usePreciseModel: boolean = false): Promise<ProcessedReceipt> {
    console.log('[GLHF] Processing receipt with:', {
      textLength: receiptText.length,
      promptLength: systemPrompt.length,
      baseUrl: BASE_URL,
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
      const data = await this.proxyManager.post('/chat/completions', body);
      console.log('[GLHF] Raw response:', data);

      const responseText = data.choices[0].message.content.trim();
      console.log('[GLHF] Extracted text:', responseText);

      const items = extractItemsFromText(responseText);
      console.log('[GLHF] Parsed items:', items);

      return { items } as ProcessedReceipt;
    } catch (error) {
      console.error('[GLHF] Error:', error);
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
      const body = {
        model: FAST_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        temperature: 0.1
      };

      const data = await this.proxyManager.post('/chat/completions', body);
      const jsonMatch = data.choices[0].message.content.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.items;
    } catch (error) {
      console.error('[GLHF] Error processing categories:', error);
      return [];
    }
  }
}

export const glhfService = new GLHFService(API_KEY || '');
export default glhfService;
