import ollama from 'ollama';

class OllamaParser {
  async parse(image: string) {
    const imageBuffer = Buffer.from(image, 'base64');
    const response = await ollama.chat({
      model: 'llama3.2-vision',
      messages: [
        {
          role: 'user',
          content: `Analyze the text in the provided image. Extract all readable content and present it in a structured Markdown format that is clear, concise, and well-organized. Ensure proper formatting (e.g., headings, lists, or code blocks) as necessary to represent the content effectively.`,
          images: [imageBuffer],
        },
      ],
    });
    return response.message.content;
  }
}

export { OllamaParser };
