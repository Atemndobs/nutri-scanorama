import { ProcessedReceipt } from './lmstudio-service';
import { extractItemsFromText } from './parsers/new-parser'; // Updated parser
import { CategoryName } from '@/types/categories';

// Updated base URL to use the cloud endpoint
// const BASE_URL = 'https://voice.cloud.atemkeng.de/v1';
const BASE_URL = import.meta.env.VITE_BASE_URL_LOCAL_LM;
const VITE_AI_FAST_MODEL_LOCAL_LM = import.meta.env.VITE_AI_FAST_MODEL_LOCAL_LM;
const VITE_AI_PRECISE_MODEL_LOCAL_LM = import.meta.env.VITE_AI_PRECISE_MODEL_LOCAL_LM;

const MODELS = {
  fast: VITE_AI_FAST_MODEL_LOCAL_LM,
  precise: VITE_AI_PRECISE_MODEL_LOCAL_LM
} as const;

export type ModelType = 'fast' | 'precise';

export class LocalLMService {
  private model: string;

  constructor() {
    this.model = MODELS.fast;
    console.log('[LocalLM] Initializing with:', {
      baseUrl: BASE_URL,
      fastModel: MODELS.fast,
      preciseModel: MODELS.precise
    });
  }

  setModel(type: ModelType) {
    this.model = MODELS[type];
    console.log(`[LocalLM] Switched to ${type} model:`, this.model);
  }

  async processReceipt(receiptText: string, systemPrompt: string): Promise<ProcessedReceipt> {
    try {
      console.log('\n[LocalLM] Starting receipt processing:', {
        modelName: this.model,
        textLength: receiptText.length,
        promptLength: systemPrompt.length,
        url: `${BASE_URL}/chat/completions`
      });

      const requestBody = {
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: receiptText }
        ],
        temperature: 0.1,
        max_tokens: 2000,
        stream: false
      };

      console.log('\n[LocalLM] Request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${BASE_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + import.meta.env.VITE_LOCALLM_API_KEY
        },
        body: JSON.stringify(requestBody)
      });

      console.log('\n[LocalLM] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('\n[LocalLM] Error response:', errorText);
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();
      console.log('\n[LocalLM] Raw response:', JSON.stringify(data, null, 2));

      const responseText = data.choices[0].message.content.trim();
      console.log('\n[LocalLM] Extracted text:', responseText);

      const items = extractItemsFromText(responseText);
      console.log('\n[LocalLM] Parsed items:', items);

      return { items } as ProcessedReceipt;
    } catch (error) {
      console.error('\n[LocalLM] API Request Error:', error);
      throw new Error('Failed to process receipt with Local LM service');
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
      console.log('\n[LocalLM] Starting category processing:', {
        modelName: this.model,
        textLength: text.length,
        url: `${BASE_URL}/chat/completions`
      });

      const requestBody = {
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        temperature: 0.1,
        max_tokens: 300,
        stream: false
      };

      console.log('\n[LocalLM] Request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + import.meta.env.VITE_LOCALLM_API_KEY
        },
        body: JSON.stringify(requestBody)
      });

      console.log('\n[LocalLM] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('\n[LocalLM] Error response:', errorText);
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();
      console.log('\n[LocalLM] Raw response:', JSON.stringify(data, null, 2));

      const responseText = data.choices[0]?.message?.content || '';
      console.log('\n[LocalLM] Extracted text:', responseText);

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.items;
    } catch (error) {
      console.error('\n[LocalLM] Error processing categories:', error);
      return [];
    }
  }
}

export const localLMService = new LocalLMService();
export default localLMService;
