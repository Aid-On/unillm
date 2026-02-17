/**
 * Model-specific streaming handlers - Registry
 *
 * Central registry for model-specific stream handlers.
 * Individual handler implementations are in separate files.
 */

import {
  gptOss120bHandler,
  gptOss20bHandler,
  llama31InstantHandler,
  llama33VersatileHandler,
} from "./streaming-handlers-groq.js";
import {
  gemini20FlashHandler,
  gemini15FlashHandler,
} from "./streaming-handlers-gemini.js";

// =============================================================================
// Handler Types
// =============================================================================

export interface StreamHandler {
  model: string;
  createStream: (
    messages: Array<{ role: string; content: string }>,
    apiKey: string,
    options?: StreamOptions
  ) => Promise<ReadableStream<string>>;
}

export interface StreamOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stopSequences?: string[] | null;
}

// =============================================================================
// Handler Registry
// =============================================================================

export const STREAM_HANDLERS: Map<string, StreamHandler> = new Map([
  // GPT-OSS models
  ['openai/gpt-oss-120b', gptOss120bHandler],
  ['openai/gpt-oss-20b', gptOss20bHandler],

  // Llama models
  ['llama-3.1-8b-instant', llama31InstantHandler],
  ['llama-3.3-70b-versatile', llama33VersatileHandler],

  // Gemini models
  ['gemini-2.0-flash', gemini20FlashHandler],
  ['gemini-1.5-flash', gemini15FlashHandler],
  ['gemini-1.5-flash-002', gemini15FlashHandler],
]);

/**
 * Get a stream handler for a specific model
 */
export function getStreamHandler(model: string): StreamHandler | undefined {
  return STREAM_HANDLERS.get(model);
}

/**
 * Check if a model has a dedicated stream handler
 */
export function hasStreamHandler(model: string): boolean {
  return STREAM_HANDLERS.has(model);
}

// Re-export individual handlers for direct access
export {
  gptOss120bHandler,
  gptOss20bHandler,
  llama31InstantHandler,
  llama33VersatileHandler,
} from "./streaming-handlers-groq.js";

export {
  gemini20FlashHandler,
  gemini15FlashHandler,
} from "./streaming-handlers-gemini.js";
