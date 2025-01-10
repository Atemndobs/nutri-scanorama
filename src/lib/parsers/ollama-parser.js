import ollama from 'ollama';
import { Image } from 'image-js';
class OllamaParser {
    async parseReceipt(image, receiptId) {
        const imageBuffer = await image.arrayBuffer();
        const imageInstance = Image.load(imageBuffer);
        try {
            const response = await ollama.chat({
                model: 'llama3.2-vision',
                messages: [{
                        role: 'user',
                        content: `Analyze the text in the provided image. Extract all readable content
                      and present it in a structured Markdown format that is clear, concise, 
                      and well-organized. Ensure proper formatting (e.g., headings, lists, or
                      code blocks) as necessary to represent the content effectively.`,
                        images: [imageInstance.data]
                    }]
            });
            const extractedText = response.message.content;
            return this.processExtractedText(extractedText, receiptId);
        }
        catch (error) {
            console.error('Error processing image:', error);
            throw new Error('Failed to extract text from image');
        }
    }
    processExtractedText(text, receiptId) {
        // Implement text processing logic here
        // This should be similar to the existing text processing logic
        // but adapted to handle the structured Markdown format from Ollama
        // For now, we'll return a dummy object
        return {
            storeName: 'Unknown',
            items: [],
            metadata: {
                totalAmount: 0
            }
        };
    }
}
export default OllamaParser;
//# sourceMappingURL=ollama-parser.js.map