declare module 'ollama' {
  export function chat(options: {
    model: string;
    messages: Array<{
      role: string;
      content: string;
      images?: Array<Uint8Array>;
    }>;
  }): Promise<{
    message: {
      content: string;
    };
  }>;
}
