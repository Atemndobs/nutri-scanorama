import { ParsedItem } from '@/types/receipt-types';

interface OllamaResponse {
  items: Array<{
    name: string;
    quantity?: number;
    pricePerUnit?: number;
    totalPrice: number;
    taxRate: string;
  }>;
}

class OllamaService {
  private readonly baseUrl: string;
  private readonly model: string;

  constructor() {
    // Using environment-independent constants
    this.baseUrl = 'http://localhost:11434';
    this.model = 'llama3.2:1b';  // Small but capable model for structured data extraction
  }

  async extractItems(receiptText: string): Promise<OllamaResponse> {
    try {
      const prompt = `
        Extract items from this receipt text. Focus on finding:
        - Item names
        - Quantities (if present)
        - Price per unit (if present)
        - Total price for each item
        - Tax rate (usually marked as A or B)

        Return a JSON object with this exact structure:
        {
          "items": [
            {
              "name": "item name",
              "quantity": number (optional),
              "pricePerUnit": number (optional),
              "totalPrice": number,
              "taxRate": "A" or "B"
            }
          ]
        }

        Receipt Text:
        ${receiptText}
      `;

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          options: {
            temperature: 0.1, // Lower temperature for more focused extraction
            num_predict: 1000, // Ensure we get complete response
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to extract items using Ollama');
      }

      const data = await response.json();
      
      // Parse the response text as JSON
      try {
        const parsedResponse = JSON.parse(data.response);
        
        // Validate response structure
        if (!Array.isArray(parsedResponse?.items)) {
          throw new Error('Invalid response format: items array not found');
        }

        // Validate and clean each item
        parsedResponse.items = parsedResponse.items.map(item => ({
          name: String(item.name || '').trim(),
          quantity: item.quantity ? Number(item.quantity) : undefined,
          pricePerUnit: item.pricePerUnit ? Number(item.pricePerUnit) : undefined,
          totalPrice: Number(item.totalPrice || 0),
          taxRate: String(item.taxRate || 'B').toUpperCase(),
        })).filter(item => 
          item.name && 
          item.totalPrice > 0 && 
          (item.taxRate === 'A' || item.taxRate === 'B')
        );

        return parsedResponse;
      } catch (error) {
        console.error('Failed to parse Ollama response:', error);
        throw new Error('Invalid response format from Ollama');
      }
    } catch (error) {
      console.error('Ollama service error:', error);
      throw error;
    }
  }
}

export const ollamaService = new OllamaService();

const OLLAMA_ENDPOINT = "http:127.0.0.1:11434";
const OLLAMA_MODEL = "llama3.2:1b";

export class ProcessedReceipt {
  storeName: string;
  items: {
    name: string;
    category: string;
    price: number;
  }[];
  totalAmount: number;

  constructor(storeName: string, items: { name: string; category: string; price: number; }[], totalAmount: number) {
    this.storeName = storeName;
    this.items = items;
    this.totalAmount = totalAmount;
  }

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

export const processReceiptWithOllama = async (imageData: string): Promise<ProcessedReceipt> => {
  try {
    const response = await fetch(`${OLLAMA_ENDPOINT}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: `You are tasked with cleaning and categorizing receipt data. The receipt contains scanned text data in various formats, including item names, quantities, prices, and store names. Your job is to: 1) Identify and cleanly format the store name. 2) Extract and categorize all items by type (e.g., Food, Drinks, Household). 3) Summarize the total cost per category. Return the results in a structured JSON format.

Receipt data: ${imageData}`,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to process receipt');
    }

    const data = await response.json();
    return new ProcessedReceipt(data.storeName, data.items, data.totalAmount);
  } catch (error) {
    console.error('Error processing receipt:', error);
    throw error;
  }
};