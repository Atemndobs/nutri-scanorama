# LLaMA OCR
## Introduction
The LLaMA OCR feature uses the Ollama API to extract text from images.

## Usage
To use the LLaMA OCR feature, simply create an instance of the `OllamaParser` class and call the `parse` method, passing in the image data as a string.

```typescript
const ollamaParser = new OllamaParser();
const imageData = '...'; // base64 encoded image data
const extractedText = await ollamaParser.parse(imageData);
console.log(extractedText);
```

## Notes
* The `OllamaParser` class assumes that the image data is base64 encoded.
* The `parse` method returns a promise that resolves to the extracted text.
