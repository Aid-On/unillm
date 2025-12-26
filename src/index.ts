/**
 * @aid-on/unillm
 *
 * True edge-native unified LLM provider - zero dependencies
 * Optimized for Cloudflare Workers, Vercel Edge Functions, and edge computing
 *
 * Core concept: ModelSpec = "provider:model" (e.g., "groq:llama-3.1-8b-instant")
 *
 * @example
 * ```typescript
 * import { generate } from '@aid-on/unillm';
 *
 * const result = await generate("groq:llama-3.1-8b-instant", messages, {
 *   groqApiKey: process.env.GROQ_API_KEY,
 * });
 * 
 * console.log(result.text);
 * ```
 */

// Types
export type {
  ProviderType,
  GroqModel,
  GeminiModel,
  CloudflareModel,
  AnyModel,
  ModelSpec,
  ParsedModelSpec,
  Credentials,
  ModelInfo,
  CheckResult,
  CheckOptions,
  GenerateOptions,
  GenerateResult,
} from "./types.js";

// Core Edge-Native API
export {
  generate,
  generateWithAnthropic,
  generateWithOpenAI,
  generateWithGroq,
  generateWithGemini,
  parseModelSpec,
  createModelSpec,
  hasCredentials,
  getCredentialsFromEnv,
  callCloudflareRest,
  callCloudflareRestStream,
} from "./factory.js";

export type { CloudflareRestResponse } from "./factory.js";

// Model metadata
export {
  MODELS,
  MODEL_BY_SPEC,
  getModelInfo,
  getModelsByProvider,
  getAllSpecs,
  getRecommendedModels,
  getAvailableModels,
  getAvailableProviders,
  DEFAULT_SPECS,
  isValidSpec,
} from "./models.js";

// Error handling
export {
  LLMProviderError,
  wrapError,
  isLLMError,
  isRetryable,
  isRetryableCode,
  statusToErrorCode,
} from "./errors.js";

export type { LLMErrorCode } from "./errors.js";

// Retry logic
export {
  withRetry,
  withRetryResult,
  createRetryWrapper,
  calculateDelay,
  sleep,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_RETRYABLE_CODES,
} from "./retry.js";

export type { RetryConfig, RetryResult } from "./retry.js";

// Structured output (edge-native with Zod)
export {
  generateObject,
  extractJSON,
} from "./structured.js";

export type {
  GenerateObjectOptions,
  GenerateObjectResult,
} from "./structured.js";

// WebStreams support for edge computing
export {
  createCloudflareStream,
  cloudflareStreamToText,
  streamToResponse,
  streamToAsyncIterator,
} from "./streams.js";

export type {
  CloudflareStreamChunk,
} from "./streams.js";

// Memory optimization for edge environments
export {
  truncateMessages,
  compressMessage,
  StreamingBuffer,
  EdgeCache,
  getMemoryEstimate,
  createCredentialsCache,
} from "./memory.js";

export type {
  OptimizedMessage,
} from "./memory.js";

// Fluent Builder API (modern TypeScript patterns)
export {
  unillm,
  quick,
  anthropic,
  openai,
  groq,
  gemini,
  cloudflare,
  UnillmBuilder,
  UnillmStructuredBuilder,
} from "./fluent.js";
