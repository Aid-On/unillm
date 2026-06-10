/**
 * Model Registry and Utilities
 *
 * Aggregates model data from provider-specific files and provides
 * lookup, filtering, and query functions.
 */

import type { ModelSpec, ModelInfo, ProviderType, Credentials } from "./types.js";
import { MODELS as BASE_MODELS } from "./models-data.js";
import { GEMINI_MODELS } from "./models-gemini.js";
import { CLOUDFLARE_MODELS } from "./models-cloudflare.js";

// =============================================================================
// Aggregated Model List
// =============================================================================

/**
 * All available models with metadata
 */
export const MODELS: ModelInfo[] = [
  ...BASE_MODELS,
  ...GEMINI_MODELS,
  ...CLOUDFLARE_MODELS,
];

// =============================================================================
// Model Lookup
// =============================================================================

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
  gemini: "gemini:gemini-2.5-flash",
  deepseek: "deepseek:deepseek-v4-flash",
  kimi: "kimi:kimi-k2.6",
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
 */
export function getAvailableModels(credentials: Credentials): ModelInfo[] {
  const providers = getAvailableProviders(credentials);
  return MODELS.filter((m) => providers.includes(m.provider));
}
