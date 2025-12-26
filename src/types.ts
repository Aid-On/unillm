/**
 * @aid-on/unilmp - Type definitions
 *
 * Edge-native types for LLM providers: Groq, Gemini, Cloudflare Workers AI
 *
 * Key concept: ModelSpec = "provider:model" (e.g., "groq:llama-3.1-8b-instant")
 */

// =============================================================================
// Provider Types
// =============================================================================

export type ProviderType = "groq" | "gemini" | "cloudflare" | "openai";

// =============================================================================
// Model Definitions
// =============================================================================

/** OpenAI supported models (verified 2025-12-26) */
export type OpenAIModel =
  // GPT-4o Series
  | "gpt-4o"
  | "gpt-4o-mini"
  | "gpt-4o-2024-11-20"
  | "gpt-4o-2024-08-06"
  | "gpt-4o-2024-05-13"
  | "gpt-4o-mini-2024-07-18"
  // GPT-4 Turbo
  | "gpt-4-turbo"
  | "gpt-4-turbo-preview"
  | "gpt-4-turbo-2024-04-09"
  | "gpt-4-0125-preview"
  | "gpt-4-1106-preview"
  // GPT-4
  | "gpt-4"
  | "gpt-4-0613"
  | "gpt-4-0314"
  // GPT-3.5 Turbo
  | "gpt-3.5-turbo"
  | "gpt-3.5-turbo-0125"
  | "gpt-3.5-turbo-1106";

/** Groq supported models (verified 2025-01-15) */
export type GroqModel =
  // Production LLMs
  | "llama-3.1-8b-instant"
  | "llama-3.3-70b-versatile"
  | "meta-llama/llama-guard-4-12b"
  | "openai/gpt-oss-120b"
  | "openai/gpt-oss-20b"
  // Production Systems
  | "groq/compound"
  | "groq/compound-mini";

/** Gemini supported models (verified 2025-01-15) */
export type GeminiModel =
  // Gemini 3 Series (Latest)
  | "gemini-3-pro-preview"
  | "gemini-3-flash-preview"
  | "gemini-3-pro-image-preview"
  // Gemini 2.5 Series
  | "gemini-2.5-pro"
  | "gemini-2.5-flash"
  | "gemini-2.5-flash-lite"
  | "gemini-2.5-flash-image"
  // Gemini 2.0 Series
  | "gemini-2.0-flash"
  | "gemini-2.0-flash-lite"
  | "gemini-2.0-flash-001"
  | "gemini-2.0-pro-exp-02-05"
  // Gemini 1.5 Series (Legacy but Active)
  | "gemini-1.5-pro-002"
  | "gemini-1.5-flash-002"
  | "gemini-1.5-flash-8b-001"
  | "gemini-1.5-pro-latest"
  | "gemini-1.5-flash-latest"
  // Experimental
  | "gemini-exp-1121"
  | "gemini-exp-1114";

/** Cloudflare Workers AI supported models (verified 2025-01-15) */
export type CloudflareModel =
  // OpenAI Models
  | "@cf/openai/gpt-oss-120b"
  | "@cf/openai/gpt-oss-20b"
  // Meta Llama Models
  | "@cf/meta/llama-4-scout-17b-16e-instruct"
  | "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
  | "@cf/meta/llama-3.1-70b-instruct"
  | "@cf/meta/llama-3.1-8b-instruct-fast"
  | "@cf/meta/llama-3.1-8b-instruct"
  // IBM Models
  | "@cf/ibm/granite-4.0-h-micro"
  // MistralAI Models
  | "@cf/mistralai/mistral-small-3.1-24b-instruct"
  | "@cf/mistralai/mistral-7b-instruct-v0.2"
  // Google Models
  | "@cf/google/gemma-3-12b-it"
  // Qwen Models
  | "@cf/qwen/qwq-32b"
  | "@cf/qwen/qwen2.5-coder-32b-instruct"
  | "@cf/qwen/qwen3-30b-a3b-fp8";

/** All model types */
export type AnyModel = OpenAIModel | GroqModel | GeminiModel | CloudflareModel;

// =============================================================================
// ModelSpec - The Core Concept
// =============================================================================

/**
 * ModelSpec: "provider:model" format string
 *
 * Examples:
 * - "openai:gpt-4o"
 * - "groq:llama-3.1-8b-instant"
 * - "gemini:gemini-2.0-flash"
 * - "cloudflare:@cf/meta/llama-3.3-70b-instruct-fp8-fast"
 */
export type ModelSpec =
  | `openai:${OpenAIModel}`
  | `groq:${GroqModel}`
  | `gemini:${GeminiModel}`
  | `cloudflare:${CloudflareModel}`;

/**
 * Parsed ModelSpec
 */
export interface ParsedModelSpec {
  provider: ProviderType;
  model: string;
  spec: ModelSpec;
}

// =============================================================================
// Credentials
// =============================================================================

export interface Credentials {
  openaiApiKey?: string;
  groqApiKey?: string;
  geminiApiKey?: string;
  /** Cloudflare API credentials (for REST API) */
  cloudflareApiKey?: string;
  cloudflareEmail?: string;
  cloudflareAccountId?: string;
}

// =============================================================================
// Model Info
// =============================================================================

export interface ModelInfo {
  /** Full spec: "provider:model" */
  spec: ModelSpec;
  /** Provider type */
  provider: ProviderType;
  /** Model ID (without provider prefix) */
  model: string;
  /** Display name */
  name: string;
  /** Context window size */
  contextWindow: number;
  /** Speed rating */
  speed: "fast" | "medium" | "slow";
  /** Cost rating */
  cost: "free" | "low" | "medium" | "high";
}

// =============================================================================
// Check Script Types
// =============================================================================

export interface CheckResult {
  /** Full spec: "provider:model" */
  spec: string;
  provider: ProviderType;
  model: string;
  success: boolean;
  responseTime: number;
  response?: string;
  error?: string;
  request: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
  };
  rawResponse?: unknown;
}

export interface CheckOptions {
  stream?: boolean;
  tools?: boolean;
  json?: boolean;
  verbose?: boolean;
}

// =============================================================================
// Edge-Native Generation Options
// =============================================================================

export interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface GenerateResult {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

// =============================================================================
// Legacy Types (for backward compatibility)
// =============================================================================

/** @deprecated Use Credentials instead */
export interface ProviderConfig {
  groq?: { apiKey: string; model?: GroqModel };
  gemini?: { apiKey: string; model?: GeminiModel };
  cloudflare?: { binding: Ai; model?: CloudflareModel };
}
