import { lmstudioService } from './lmstudio-service';
import { glhfService } from './glhf-service';
import { localLMService } from './local-lm-service';
class AIProviderManager {
    providers = {
        lmstudio: lmstudioService,
        glhf: glhfService,
        locallm: localLMService
    };
    currentProvider = 'locallm';
    providerOrder = ['locallm', 'lmstudio', 'glhf'];
    modelType = 'fast';
    setModelType(type) {
        this.modelType = type;
        console.log('[AIProviderManager] Model type set to:', type);
    }
    async processReceipt(receiptText) {
        const systemPrompt = `You are a receipt analyzer. Extract items from the receipt with their names, categories, and prices.
ONLY include items that have both a clear name and a valid price (numeric value).
DO NOT make up or repeat items.
DO NOT include store name, date, or any other information.

IMPORTANT: Use ONLY these exact categories:
- Fruits (for fresh fruits, dried fruits)
- Vegetables (for fresh or frozen vegetables)
- Dairy (for milk, cheese, yogurt, cream)
- Meat (for meat, fish, poultry)
- Bakery (for bread, pastries)
- Beverages (for drinks, water, juice)
- Snacks (for nuts, chips, crackers)
- Cereals (for breakfast cereals, muesli)
- Sweets (for candy, chocolate)
- Oils (for cooking oils, vinegar)
- Other (for anything else)

Respond in a markdown table format with EXACTLY these columns:
Name | Category | Price

Guidelines:
1. Price must be a valid number between 0.01 and 999.99
2. Remove any currency symbols (€, EUR) from prices
3. Use dots for decimal points (e.g., 1.99 not 1,99)
4. If a price seems unreasonably high (>1000), divide it by 100
5. Name should be the product name only (no prices or quantities)
6. Maximum 20 items
7. Skip any non-product lines (totals, store info, etc.)`;
        const providers = [
            {
                name: 'locallm',
                fn: async () => localLMService.processReceipt(receiptText, systemPrompt)
            },
            {
                name: 'lmstudio',
                fn: async () => lmstudioService.processReceipt(receiptText, systemPrompt)
            },
            {
                name: 'glhf',
                fn: async () => {
                    console.log('[AIProviderManager] Using GLHF with model type:', this.modelType);
                    return await glhfService.processReceipt(receiptText, systemPrompt, this.modelType === 'precise');
                }
            }
        ];
        let lastError = null;
        const errors = {};
        for (const provider of providers) {
            try {
                console.log(`[AIProviderManager] Trying ${provider.name}...`);
                const result = await provider.fn();
                console.log(`[AIProviderManager] Success with ${provider.name}`);
                return result;
            }
            catch (error) {
                console.error(`[AIProviderManager] Error with ${provider.name}:`, {
                    message: error.message,
                    stack: error.stack,
                    provider: provider.name
                });
                lastError = error;
                errors[provider.name] = error;
            }
        }
        if (lastError) {
            const errorDetails = Object.entries(errors)
                .map(([name, error]) => `${name}: ${error.message}`)
                .join('; ');
            console.error('[AIProviderManager] All providers failed:', errorDetails);
            throw new Error(`All AI providers failed to process receipt. Errors: ${errorDetails}`);
        }
        throw new Error('No AI providers available');
    }
    async processCategoryText(text, provider) {
        if (provider) {
            try {
                return await this.providers[provider].processCategoryText(text);
            }
            catch (error) {
                console.error(`[AIProviderManager] Error with ${provider}:`, error);
                throw new Error(`Failed to process categories with ${provider} service: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
        // If no specific provider is requested, try them in order
        let lastError = null;
        const failedProviders = [];
        for (const currentProvider of this.providerOrder) {
            try {
                console.log(`[AIProviderManager] Attempting to process categories with provider: ${currentProvider}`);
                return await this.providers[currentProvider].processCategoryText(text);
            }
            catch (error) {
                console.error(`[AIProviderManager] Error with ${currentProvider}:`, error);
                lastError = error;
                failedProviders.push(currentProvider);
                continue; // Try next provider
            }
        }
        // If we get here, all providers failed
        const errorMessage = `All AI providers failed to process categories (tried: ${failedProviders.join(', ')}). Last error: ${lastError?.message}`;
        console.error('[AIProviderManager]', errorMessage);
        throw new Error(errorMessage);
    }
    setModel(type, provider) {
        const selectedProvider = provider || this.currentProvider;
        this.providers[selectedProvider].setModel(type);
    }
    setProvider(provider) {
        this.currentProvider = provider;
    }
    getProvider() {
        return this.currentProvider;
    }
}
export const aiProviderManager = new AIProviderManager();
export default aiProviderManager;
//# sourceMappingURL=ai-provider-manager.js.map