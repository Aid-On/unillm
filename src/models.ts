/**
 * Model Definitions
 *
 * All available models with metadata, indexed by ModelSpec.
 * Verified working as of 2025-12-17.
 */

import type { ModelSpec, ModelInfo, ProviderType, Credentials } from "./types.js";

/**
 * All available models with metadata
 * Updated with comprehensive research from official sources (2025-01-15)
 */
export const MODELS: ModelInfo[] = [
  // ==========================================================================
  // Anthropic models (verified 2025-12-26)
  // ==========================================================================
  
  // Claude Opus 4.5 Series (2025 Latest)
  {
    spec: "anthropic:claude-opus-4-5-20251101",
    provider: "anthropic",
    model: "claude-opus-4-5-20251101",
    name: "Claude Opus 4.5 (Most Intelligent)",
    contextWindow: 200000,
    speed: "slow",
    cost: "high",
  },
  
  // Claude Haiku 4.5 Series
  {
    spec: "anthropic:claude-haiku-4-5-20251001",
    provider: "anthropic",
    model: "claude-haiku-4-5-20251001",
    name: "Claude Haiku 4.5 (Ultra Fast)",
    contextWindow: 200000,
    speed: "fast",
    cost: "low",
  },
  
  // Claude Sonnet 4.5 Series
  {
    spec: "anthropic:claude-sonnet-4-5-20250929",
    provider: "anthropic",
    model: "claude-sonnet-4-5-20250929",
    name: "Claude Sonnet 4.5 (Best for Coding)",
    contextWindow: 200000,
    speed: "fast",
    cost: "medium",
  },
  
  // Claude Opus 4.1 Series
  {
    spec: "anthropic:claude-opus-4-1-20250805",
    provider: "anthropic",
    model: "claude-opus-4-1-20250805",
    name: "Claude Opus 4.1",
    contextWindow: 200000,
    speed: "slow",
    cost: "high",
  },
  
  // Claude 4 Series
  {
    spec: "anthropic:claude-opus-4-20250514",
    provider: "anthropic",
    model: "claude-opus-4-20250514",
    name: "Claude Opus 4",
    contextWindow: 200000,
    speed: "slow",
    cost: "high",
  },
  {
    spec: "anthropic:claude-sonnet-4-20250514",
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    name: "Claude Sonnet 4",
    contextWindow: 200000,
    speed: "fast",
    cost: "medium",
  },
  
  // Claude 3.5 Series
  {
    spec: "anthropic:claude-3-5-haiku-20241022",
    provider: "anthropic",
    model: "claude-3-5-haiku-20241022",
    name: "Claude 3.5 Haiku",
    contextWindow: 200000,
    speed: "fast",
    cost: "low",
  },
  
  // Claude 3 Series
  {
    spec: "anthropic:claude-3-haiku-20240307",
    provider: "anthropic",
    model: "claude-3-haiku-20240307",
    name: "Claude 3 Haiku",
    contextWindow: 200000,
    speed: "fast",
    cost: "low",
  },
  
  
  // ==========================================================================
  // OpenAI models (verified 2025-12-26)
  // ==========================================================================
  
  // GPT-4o Series
  {
    spec: "openai:gpt-4o",
    provider: "openai",
    model: "gpt-4o",
    name: "GPT-4o (Latest)",
    contextWindow: 128000,
    speed: "fast",
    cost: "high",
  },
  {
    spec: "openai:gpt-4o-mini",
    provider: "openai",
    model: "gpt-4o-mini",
    name: "GPT-4o Mini",
    contextWindow: 128000,
    speed: "fast",
    cost: "low",
  },
  {
    spec: "openai:gpt-4o-2024-11-20",
    provider: "openai",
    model: "gpt-4o-2024-11-20",
    name: "GPT-4o (2024-11-20)",
    contextWindow: 128000,
    speed: "fast",
    cost: "high",
  },
  {
    spec: "openai:gpt-4o-2024-08-06",
    provider: "openai",
    model: "gpt-4o-2024-08-06",
    name: "GPT-4o (2024-08-06)",
    contextWindow: 128000,
    speed: "fast",
    cost: "high",
  },
  
  // GPT-4 Turbo
  {
    spec: "openai:gpt-4-turbo",
    provider: "openai",
    model: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    contextWindow: 128000,
    speed: "medium",
    cost: "high",
  },
  {
    spec: "openai:gpt-4-turbo-preview",
    provider: "openai",
    model: "gpt-4-turbo-preview",
    name: "GPT-4 Turbo Preview",
    contextWindow: 128000,
    speed: "medium",
    cost: "high",
  },
  
  // GPT-4
  {
    spec: "openai:gpt-4",
    provider: "openai",
    model: "gpt-4",
    name: "GPT-4",
    contextWindow: 8192,
    speed: "slow",
    cost: "high",
  },
  
  // GPT-3.5 Turbo
  {
    spec: "openai:gpt-3.5-turbo",
    provider: "openai",
    model: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    contextWindow: 16385,
    speed: "fast",
    cost: "low",
  },
  {
    spec: "openai:gpt-3.5-turbo-0125",
    provider: "openai",
    model: "gpt-3.5-turbo-0125",
    name: "GPT-3.5 Turbo (0125)",
    contextWindow: 16385,
    speed: "fast",
    cost: "low",
  },
  
  // ==========================================================================
  // Groq models (verified 2025-01-15) 
  // ==========================================================================
  
  // Production LLMs
  {
    spec: "groq:llama-3.1-8b-instant",
    provider: "groq",
    model: "llama-3.1-8b-instant",
    name: "Llama 3.1 8B Instant",
    contextWindow: 131072,
    speed: "fast",
    cost: "low",
  },
  {
    spec: "groq:llama-3.3-70b-versatile",
    provider: "groq",
    model: "llama-3.3-70b-versatile",
    name: "Llama 3.3 70B Versatile",
    contextWindow: 131072,
    speed: "medium",
    cost: "medium",
  },
  {
    spec: "groq:meta-llama/llama-guard-4-12b",
    provider: "groq",
    model: "meta-llama/llama-guard-4-12b",
    name: "Llama Guard 4 12B",
    contextWindow: 131072,
    speed: "fast",
    cost: "low",
  },
  {
    spec: "groq:openai/gpt-oss-120b",
    provider: "groq",
    model: "openai/gpt-oss-120b",
    name: "GPT-OSS 120B",
    contextWindow: 131072,
    speed: "medium",
    cost: "low",
  },
  {
    spec: "groq:openai/gpt-oss-20b",
    provider: "groq",
    model: "openai/gpt-oss-20b",
    name: "GPT-OSS 20B",
    contextWindow: 131072,
    speed: "fast",
    cost: "low",
  },
  
  // Production Systems
  {
    spec: "groq:groq/compound",
    provider: "groq",
    model: "groq/compound",
    name: "Groq Compound (Web Search + Code)",
    contextWindow: 131072,
    speed: "medium",
    cost: "medium",
  },
  {
    spec: "groq:groq/compound-mini",
    provider: "groq",
    model: "groq/compound-mini",
    name: "Groq Compound Mini (Web Search + Code)",
    contextWindow: 131072,
    speed: "medium",
    cost: "low",
  },

  // ==========================================================================
  // Gemini models (verified 2025-01-15)
  // ==========================================================================
  
  // Gemini 3 Series (Latest)
  {
    spec: "gemini:gemini-3-pro-preview",
    provider: "gemini",
    model: "gemini-3-pro-preview",
    name: "Gemini 3 Pro (Preview)",
    contextWindow: 1048576,
    speed: "slow",
    cost: "high",
  },
  {
    spec: "gemini:gemini-3-flash-preview",
    provider: "gemini",
    model: "gemini-3-flash-preview",
    name: "Gemini 3 Flash (Preview)",
    contextWindow: 1048576,
    speed: "fast",
    cost: "medium",
  },
  
  // Gemini 2.5 Series
  {
    spec: "gemini:gemini-2.5-pro",
    provider: "gemini",
    model: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    contextWindow: 1048576,
    speed: "slow",
    cost: "high",
  },
  {
    spec: "gemini:gemini-2.5-flash",
    provider: "gemini",
    model: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    contextWindow: 1048576,
    speed: "fast",
    cost: "medium",
  },
  
  // Gemini 2.0 Series
  {
    spec: "gemini:gemini-2.0-flash",
    provider: "gemini",
    model: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    contextWindow: 1048576,
    speed: "fast",
    cost: "low",
  },
  {
    spec: "gemini:gemini-2.0-flash-lite",
    provider: "gemini",
    model: "gemini-2.0-flash-lite",
    name: "Gemini 2.0 Flash Lite",
    contextWindow: 1048576,
    speed: "fast",
    cost: "low",
  },
  
  // Gemini 1.5 Series (Legacy but Active)
  {
    spec: "gemini:gemini-1.5-pro-002",
    provider: "gemini",
    model: "gemini-1.5-pro-002",
    name: "Gemini 1.5 Pro",
    contextWindow: 1048576,
    speed: "medium",
    cost: "medium",
  },
  {
    spec: "gemini:gemini-1.5-flash-002",
    provider: "gemini",
    model: "gemini-1.5-flash-002",
    name: "Gemini 1.5 Flash",
    contextWindow: 1048576,
    speed: "fast",
    cost: "low",
  },

  // ==========================================================================
  // Cloudflare Workers AI models (verified 2025-01-15)
  // ==========================================================================
  
  // OpenAI Models
  {
    spec: "cloudflare:@cf/openai/gpt-oss-120b",
    provider: "cloudflare",
    model: "@cf/openai/gpt-oss-120b",
    name: "GPT-OSS 120B",
    contextWindow: 128000,
    speed: "medium",
    cost: "medium",
  },
  {
    spec: "cloudflare:@cf/openai/gpt-oss-20b",
    provider: "cloudflare",
    model: "@cf/openai/gpt-oss-20b",
    name: "GPT-OSS 20B",
    contextWindow: 128000,
    speed: "fast",
    cost: "low",
  },
  
  // Meta Llama Models
  {
    spec: "cloudflare:@cf/meta/llama-4-scout-17b-16e-instruct",
    provider: "cloudflare",
    model: "@cf/meta/llama-4-scout-17b-16e-instruct",
    name: "Llama 4 Scout 17B (Multimodal)",
    contextWindow: 131072,
    speed: "medium",
    cost: "free",
  },
  {
    spec: "cloudflare:@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    provider: "cloudflare",
    model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    name: "Llama 3.3 70B (FP8 Fast)",
    contextWindow: 131072,
    speed: "fast",
    cost: "free",
  },
  {
    spec: "cloudflare:@cf/meta/llama-3.1-70b-instruct",
    provider: "cloudflare",
    model: "@cf/meta/llama-3.1-70b-instruct",
    name: "Llama 3.1 70B Instruct",
    contextWindow: 131072,
    speed: "medium",
    cost: "free",
  },
  {
    spec: "cloudflare:@cf/meta/llama-3.1-8b-instruct-fast",
    provider: "cloudflare",
    model: "@cf/meta/llama-3.1-8b-instruct-fast",
    name: "Llama 3.1 8B Instruct (Fast)",
    contextWindow: 131072,
    speed: "fast",
    cost: "free",
  },
  {
    spec: "cloudflare:@cf/meta/llama-3.1-8b-instruct",
    provider: "cloudflare",
    model: "@cf/meta/llama-3.1-8b-instruct",
    name: "Llama 3.1 8B Instruct",
    contextWindow: 131072,
    speed: "fast",
    cost: "free",
  },
  
  // IBM Models
  {
    spec: "cloudflare:@cf/ibm/granite-4.0-h-micro",
    provider: "cloudflare",
    model: "@cf/ibm/granite-4.0-h-micro",
    name: "IBM Granite 4.0 H Micro",
    contextWindow: 131072,
    speed: "fast",
    cost: "free",
  },
  
  // MistralAI Models
  {
    spec: "cloudflare:@cf/mistralai/mistral-small-3.1-24b-instruct",
    provider: "cloudflare",
    model: "@cf/mistralai/mistral-small-3.1-24b-instruct",
    name: "Mistral Small 3.1 24B",
    contextWindow: 131072,
    speed: "medium",
    cost: "free",
  },
  {
    spec: "cloudflare:@cf/mistralai/mistral-7b-instruct-v0.2",
    provider: "cloudflare",
    model: "@cf/mistralai/mistral-7b-instruct-v0.2",
    name: "Mistral 7B Instruct v0.2",
    contextWindow: 32768,
    speed: "fast",
    cost: "free",
  },
  
  // Google Models
  {
    spec: "cloudflare:@cf/google/gemma-3-12b-it",
    provider: "cloudflare",
    model: "@cf/google/gemma-3-12b-it",
    name: "Gemma 3 12B IT",
    contextWindow: 128000,
    speed: "fast",
    cost: "free",
  },
  
  // Qwen Models
  {
    spec: "cloudflare:@cf/qwen/qwq-32b",
    provider: "cloudflare",
    model: "@cf/qwen/qwq-32b",
    name: "QwQ 32B (Reasoning)",
    contextWindow: 131072,
    speed: "medium",
    cost: "free",
  },
  {
    spec: "cloudflare:@cf/qwen/qwen2.5-coder-32b-instruct",
    provider: "cloudflare",
    model: "@cf/qwen/qwen2.5-coder-32b-instruct",
    name: "Qwen 2.5 Coder 32B",
    contextWindow: 131072,
    speed: "medium",
    cost: "free",
  },
  // Note: Qwen3 30B returns reasoning_content instead of standard content
  // Currently not fully supported for standard chat use cases
  // {
  //   spec: "cloudflare:@cf/qwen/qwen3-30b-a3b-fp8",
  //   provider: "cloudflare",
  //   model: "@cf/qwen/qwen3-30b-a3b-fp8",
  //   name: "Qwen 3 30B A3B (FP8)",
  //   contextWindow: 131072,
  //   speed: "medium",
  //   cost: "free",
  // },
];

/**
 * Model lookup by spec
 */
export const MODEL_BY_SPEC: Record<string, ModelInfo> = Object.fromEntries(
  MODELS.map((m) => [m.spec, m])
);

/**
 * Get model info by spec
 */
export function getModelInfo(spec: ModelSpec | string): ModelInfo | undefined {
  return MODEL_BY_SPEC[spec];
}

/**
 * Get models by provider
 */
export function getModelsByProvider(provider: ProviderType): ModelInfo[] {
  return MODELS.filter((m) => m.provider === provider);
}

/**
 * Get all model specs
 */
export function getAllSpecs(): ModelSpec[] {
  return MODELS.map((m) => m.spec);
}

/**
 * Get recommended models (fast + low/free cost)
 */
export function getRecommendedModels(): ModelInfo[] {
  return MODELS.filter(
    (m) => m.speed === "fast" && (m.cost === "free" || m.cost === "low")
  );
}

/**
 * Default model specs for each provider
 */
export const DEFAULT_SPECS: Record<ProviderType, ModelSpec> = {
  anthropic: "anthropic:claude-sonnet-4-5-20250929",
  openai: "openai:gpt-4o-mini",
  groq: "groq:llama-3.1-8b-instant",
  gemini: "gemini:gemini-2.0-flash",
  cloudflare: "cloudflare:@cf/meta/llama-3.3-70b-instruct-fp8-fast",
};

/**
 * Check if a spec is valid
 */
export function isValidSpec(spec: string): spec is ModelSpec {
  return spec in MODEL_BY_SPEC;
}

/**
 * Get available providers based on credentials
 */
export function getAvailableProviders(credentials: Credentials): ProviderType[] {
  const providers: ProviderType[] = [];
  if (credentials.anthropicApiKey) providers.push("anthropic");
  if (credentials.openaiApiKey) providers.push("openai");
  if (credentials.groqApiKey) providers.push("groq");
  if (credentials.geminiApiKey) providers.push("gemini");
  if (credentials.cloudflareAccountId) providers.push("cloudflare");
  return providers;
}

/**
 * Get available models based on credentials
 * Only returns models for providers that have API keys configured
 */
export function getAvailableModels(credentials: Credentials): ModelInfo[] {
  const providers = getAvailableProviders(credentials);
  return MODELS.filter((m) => providers.includes(m.provider));
}
