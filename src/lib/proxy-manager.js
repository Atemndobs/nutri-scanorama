export class ProxyManager {
    baseUrl;
    apiKey;
    constructor(baseUrl, apiKey) {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
        console.log('[ProxyManager] Initialized with base URL:', baseUrl);
    }
    async post(endpoint, body) {
        const url = `${this.baseUrl}${endpoint}`;
        console.log('[ProxyManager] Making request to:', url);
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(body)
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.error('[ProxyManager] Error response:', {
                    status: response.status,
                    statusText: response.statusText,
                    body: errorText
                });
                throw new Error(`Proxy Manager: ${response.status} - ${errorText || response.statusText}`);
            }
            return await response.json();
        }
        catch (error) {
            console.error('[ProxyManager] Request failed:', error);
            throw error;
        }
    }
}
//# sourceMappingURL=proxy-manager.js.map