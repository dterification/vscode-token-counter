import { encode } from 'gpt-tokenizer';

export interface Tokenizer {
  count(text: string): number;
  readonly modelLabel: string;
}

class GptTokenizer implements Tokenizer {
  constructor(public readonly modelLabel: string) {}

  count(text: string): number {
    try {
      return encode(text).length;
    } catch {
      // Fallback for text that cannot be encoded (e.g. null bytes)
      return Math.ceil(text.length / 4);
    }
  }
}

export function createTokenizer(model: string): Tokenizer {
  return new GptTokenizer(model);
}
