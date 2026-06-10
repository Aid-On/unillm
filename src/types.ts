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

export type ProviderType = "groq" | "gemini" | "cloudflare" | "openai" | "anthropic" | "deepseek" | "kimi";

// =============================================================================
// Model Definitions
// =============================================================================

/** Anthropic supported models (verified 2025-12-26) */
export type AnthropicModel =
  // Claude Opus 4.5 Series (2025 Latest)
  | "claude-opus-4-5-20251101"
  // Claude Haiku 4.5 Series
  | "claude-haiku-4-5-20251001"
  // Claude Sonnet 4.5 Series
  | "claude-sonnet-4-5-20250929"
  // Claude Opus 4.1 Series
  | "claude-opus-4-1-20250805"
  // Claude 4 Series
  | "claude-opus-4-20250514"
  | "claude-sonnet-4-20250514"
  // Claude 3.5 Series
  | "claude-3-5-haiku-20241022"
  // Claude 3 Series
  | "claude-3-haiku-20240307";

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

/**
 * Gemini supported models (verified 2026-06-10)
 *
 * 2.0 系・1.5 系・exp 系は Google 側で廃止済み（404）のため削除。
 * text-smash の 2026-06-02 インシデント（gemini-2.0-flash 廃止で OCR 全滅）の再発防止。
 */
export type GeminiModel =
  // Gemini 3 Series (Latest)
  | "gemini-3-pro-preview"
  | "gemini-3-flash-preview"
  | "gemini-3-pro-image-preview"
  // Gemini 2.5 Series
  | "gemini-2.5-pro"
  | "gemini-2.5-flash"
  | "gemini-2.5-flash-lite"
  | "gemini-2.5-flash-image";

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

/** DeepSeek supported models (verified 2026-04-30) */
export type DeepSeekModel =
  | "deepseek-v4-pro"
  | "deepseek-v4-flash"
  | "deepseek-v3.2"
  | "deepseek-reasoner";

/** Kimi (Moonshot) supported models (verified 2026-04-30) */
export type KimiModel =
  | "kimi-k2.6"
  | "kimi-k2.5"
  | "moonshot-v1-auto";

/** All model types */
export type AnyModel = AnthropicModel | OpenAIModel | GroqModel | GeminiModel | CloudflareModel | DeepSeekModel | KimiModel;

// =============================================================================
// ModelSpec - The Core Concept
// =============================================================================

/**
 * ModelSpec: "provider:model" format string
 *
 * Examples:
 * - "anthropic:claude-3-5-sonnet-latest"
 * - "openai:gpt-4o"
 * - "groq:llama-3.1-8b-instant"
 * - "gemini:gemini-2.5-flash"
 * - "cloudflare:@cf/meta/llama-3.3-70b-instruct-fp8-fast"
 */
export type ModelSpec =
  | `anthropic:${AnthropicModel}`
  | `openai:${OpenAIModel}`
  | `groq:${GroqModel}`
  | `gemini:${GeminiModel}`
  | `cloudflare:${CloudflareModel}`
  | `deepseek:${DeepSeekModel}`
  | `kimi:${KimiModel}`;

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
  anthropicApiKey?: string;
  openaiApiKey?: string;
  groqApiKey?: string;
  geminiApiKey?: string;
  deepseekApiKey?: string;
  kimiApiKey?: string;
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
  tools?: ToolDefinition[];
  toolChoice?: "auto" | "required" | "none";
}

export interface GenerateResult {
  text: string;
  toolCalls?: ToolUseBlock[];
  stopReason?: "end_turn" | "tool_use" | "max_tokens" | "stop";
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

// =============================================================================
// Tool Calling Types
// =============================================================================

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface ToolUseBlock {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

// =============================================================================
// Rich Message Types (for multi-turn tool conversations)
// =============================================================================

export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean };

export interface RichMessage {
  role: "user" | "assistant" | "system";
  content: string | ContentBlock[];
}

/** Simple text-only message (backward compatible) */
export interface SimpleMessage {
  role: string;
  content: string;
}

export type AnyMessage = SimpleMessage | RichMessage;

// =============================================================================
// Streaming Event Types
// =============================================================================

export type StreamEvent =
  | { type: "text_delta"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "done"; stopReason: "end_turn" | "tool_use" | "max_tokens" | "stop" };

// =============================================================================
// Legacy Types (for backward compatibility)
// =============================================================================

/** @deprecated Use Credentials instead */
export interface ProviderConfig {
  groq?: { apiKey: string; model?: GroqModel };
  gemini?: { apiKey: string; model?: GeminiModel };
  cloudflare?: { binding: Ai; model?: CloudflareModel };
}
