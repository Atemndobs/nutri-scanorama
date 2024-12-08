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
  private readonly model: string;

  constructor() {
    this.apiUrl = API_URL;
    this.model = 'hugging-quants/llama-3.2-1b-instruct';
  }

  async processReceipt(receiptText: string): Promise<ProcessedReceipt> {
    console.log('\n[OLLAMA] Starting receipt processing...');
    console.log('[OLLAMA] Receipt text length:', receiptText.length);
    console.log('[OLLAMA] First 100 chars of receipt:', receiptText.substring(0, 100));

    try {
      const itemsExtracted = extractItemsFromText(receiptText);
      console.log('[OLLAMA] Extracted items:', itemsExtracted);

      const requestPayload = {
        model: this.model,
        messages: [
          { 
            role: 'system', 
            content: 'Extract all shopping items and prices identified in this receipt, make sure it\'s only items from this. Don\'t add anything extra and if you don\'t recognize anything, skip it.' 
          },
          { role: 'user', content: receiptText },
        ],
        temperature: 0.7,
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

  private parseResponseToItems(responseData: any): Array<{ name: string; category: string; price: number }> {
    try {
      const items = [];
      
      // Extract content from the choices array
      const content = responseData.choices?.[0]?.message?.content;
      if (!content) {
        console.log('\n[OLLAMA] No content found in response');
        return [];
      }

      console.log('\n[OLLAMA] Parsing response content:', content);
      
      // Split the content into lines and process each line
      const lines = content.split('\n');
      for (const line of lines) {
        // Skip empty lines and headers
        if (!line.trim() || line.includes('Here are the shopping items')) {
          continue;
        }

        // Remove bullet points and clean the line
        const cleanLine = line.replace(/^[-•*]\s*/, '').trim();
        if (!cleanLine) continue;

        const priceFormats = [
          // Format: Item name - price EUR
          /^(.*?)\s*-\s*([\d,.]+)\s*(?:EUR|€)/i,
          // Format: Item name (code) - price
          /^(.*?)\s*\([^)]*\)\s*-\s*([\d,.]+)/,
          // Format: Item name - price/unit
          /^(.*?)\s*-\s*([\d,.]+)\s*EUR\/(?:kg|g|unit)/i,
          // Format: Item name price EUR
          /^(.*?)\s+([\d,.]+)\s*(?:EUR|€)/i
        ];

        let matched = false;
        for (const format of priceFormats) {
          const match = cleanLine.match(format);
          if (match) {
            const [_, name, priceStr] = match;
            const cleanName = name.replace(/\([^)]*\)/g, '').trim(); // Remove parenthetical content
            const cleanPrice = parseFloat(priceStr.replace(',', '.').replace("'", ''));

            if (!isNaN(cleanPrice) && cleanName && !cleanName.toLowerCase().includes('summe')) {
              items.push({
                name: cleanName,
                category: 'UNKNOWN',
                price: cleanPrice
              });
              matched = true;
              break;
            }
          }
        }

        // If no format matched, try to extract any number that looks like a price
        if (!matched) {
          const priceMatch = cleanLine.match(/(\d+[.,']?\d*)\s*(?:EUR|€)/);
          if (priceMatch) {
            const name = cleanLine.replace(/(\d+[.,']?\d*)\s*(?:EUR|€)/, '').trim();
            const cleanName = name.replace(/\([^)]*\)/g, '').trim();
            const cleanPrice = parseFloat(priceMatch[1].replace(',', '.').replace("'", ''));

            if (!isNaN(cleanPrice) && cleanName && !cleanName.toLowerCase().includes('summe')) {
              items.push({
                name: cleanName,
                category: 'UNKNOWN',
                price: cleanPrice
              });
            }
          }
        }
      }

      console.log('\n[OLLAMA] Parsed items:', items);
      if (items.length === 0) {
        console.log('\n[OLLAMA] No items found. Please try scanning the receipt again.');
      }
      return items;
    } catch (error) {
      console.error('[OLLAMA] Error parsing response:', error);
      return [];
    }
  }
}

export const ollamaService = new OllamaService();