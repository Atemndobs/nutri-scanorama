import { lmstudioService } from './lmstudio-service';
import { glhfService } from './glhf-service';
import { localLMService } from './local-lm-service';
import { ProcessedReceipt } from './lmstudio-service';
import { CategoryName } from '@/types/categories';

export type AIProvider = 'lmstudio' | 'glhf' | 'locallm';
export type ModelType = 'fast' | 'precise';

class AIProviderManager {
  private providers = {
    lmstudio: lmstudioService,
    glhf: glhfService,
    locallm: localLMService
  };

  private currentProvider: AIProvider = 'locallm';

  async processReceipt(receiptText: string): Promise<ProcessedReceipt> {
    const selectedProvider = 'locallm'; // Force using local LM provider
    
    try {
      const systemPrompt = 'Extract items from the receipt with name, category, and price. Respond in a markdown table format with columns: Name | Category | Price';
      return await this.providers[selectedProvider].processReceipt(receiptText, systemPrompt);
    } catch (error) {
      console.error(`[AIProviderManager] Error with ${selectedProvider}:`, error);
      throw new Error(`Failed to process receipt with ${selectedProvider} service`);
    }
  }

  async processCategoryText(text: string, provider?: AIProvider): Promise<Array<{ keyword: string, category: CategoryName }>> {
    const selectedProvider = provider || this.currentProvider;
    
    try {
      return await this.providers[selectedProvider].processCategoryText(text);
    } catch (error) {
      console.error(`[AIProviderManager] Error with ${selectedProvider}:`, error);
      throw new Error(`Failed to process categories with ${selectedProvider} service`);
    }
  }

  setModel(type: ModelType, provider?: AIProvider) {
    const selectedProvider = provider || this.currentProvider;
    this.providers[selectedProvider].setModel(type);
  }

  setProvider(provider: AIProvider) {
    this.currentProvider = provider;
  }

  getProvider(): AIProvider {
    return this.currentProvider;
  }
}

export const aiProviderManager = new AIProviderManager();
export default aiProviderManager;
