import { CategoryName } from '@/types/categories';
import { ProxyManager } from './proxy-manager';

const BASE_URL = 'https://glhf.chat/api/openai/v1';

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
    this.proxyManager = new ProxyManager(BASE_URL, apiKey);
  }

  async processReceipt(receiptText: string, systemPrompt: string): Promise<ProcessedReceipt> {
    console.log('[GLHF] Processing receipt with:', {
      textLength: receiptText.length,
      promptLength: systemPrompt.length
    });

    const body = {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: receiptText }
      ],
      temperature: 0.1,
    };

    const data = await this.proxyManager.post('/chat/completions', body);

    const responseText = data.choices[0].message.content.trim();
    try {
      return JSON.parse(responseText);
    } catch (error) {
      console.error('[GLHF] Failed to parse response as JSON:', error);
      throw new Error('Invalid response format from GLHF service');
    }
  }

  async processCategoryText(text: string): Promise<Array<{ keyword: string, category: CategoryName }>> {
    const systemPrompt = `You are a product categorizer. Given a list of product names or descriptions, return ONLY valid JSON with categorized items.
    
    The response must be in the following format:
    {
      "items": [
        {
          "keyword": "product name",
          "category": "one of the valid categories"
        }
      ]
    }
    
    Valid categories are: "PRODUCE", "MEAT", "DAIRY", "BAKERY", "PANTRY", "SNACKS", "BEVERAGES", "HOUSEHOLD", "PERSONAL_CARE", "OTHER".
    
    Example input:
    Bananas
    Chicken breast
    Milk
    
    Example response:
    {
      "items": [
        {
          "keyword": "Bananas",
          "category": "PRODUCE"
        },
        {
          "keyword": "Chicken breast",
          "category": "MEAT"
        },
        {
          "keyword": "Milk",
          "category": "DAIRY"
        }
      ]
    }`;

    try {
      console.log('[GLHF] Processing categories with:', {
        textLength: text.length
      });

      const response = await this.proxyManager.post('/chat/completions', {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        temperature: 0.1,
        max_tokens: 300,
      });

      const data = await response.json();
      console.log('[GLHF] Raw response:', data);

      const responseText = data.choices[0]?.message?.content || '';
      console.log('\n[GLHF] Raw Response:', responseText);

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
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

export const glhfService = new GLHFService(import.meta.env.VITE_GLHF_API_KEY || '');
export default glhfService;
