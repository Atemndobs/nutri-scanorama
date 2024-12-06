const OLLAMA_ENDPOINT = "http:127.0.0.1:11434";
const OLLAMA_MODEL = "llama3.2:1b";

export interface ProcessedReceipt {
  storeName: string;
  items: {
    name: string;
    category: string;
    price: number;
  }[];
  totalAmount: number;
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
    return data;
  } catch (error) {
    console.error('Error processing receipt:', error);
    throw error;
  }
};