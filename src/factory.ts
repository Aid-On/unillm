/**
 * Edge-Native Provider Factory
 *
 * Core factory function and utilities for routing to provider-specific
 * implementations. Pure fetch API - no external dependencies.
 */

import type {
  ModelSpec,
  ParsedModelSpec,
  ProviderType,
  Credentials,
} from "./types.js";
import {
  generateWithAnthropic,
  generateWithOpenAI,
  generateWithGroq,
  generateWithGemini,
  callCloudflareRest,
  extractGptOssResponse,
} from "./factory-providers.js";

// Re-export provider functions for backward compatibility
export {
  generateWithAnthropic,
  generateWithOpenAI,
  generateWithGroq,
  generateWithGemini,
  callCloudflareRest,
  callCloudflareRestStream,
} from "./factory-providers.js";

export type { CloudflareRestResponse } from "./factory-providers.js";

// =============================================================================
// Core API
// =============================================================================

/**
 * Parse a ModelSpec string into its components
 */
export function parseModelSpec(spec: string): ParsedModelSpec {
  const colonIndex = spec.indexOf(":");
  if (colonIndex === -1) {
    throw new Error(`Invalid ModelSpec: "${spec}". Expected format: "provider:model"`);
  }

  const provider = spec.slice(0, colonIndex) as ProviderType;
  const model = spec.slice(colonIndex + 1);

  if (!["anthropic", "openai", "groq", "gemini", "cloudflare"].includes(provider)) {
    throw new Error(`Unknown provider: "${provider}". Expected: anthropic, openai, groq, gemini, or cloudflare`);
  }

  if (!model) {
    throw new Error(`Model ID is required in spec: "${spec}"`);
  }

  return {
    provider,
    model,
    spec: spec as ModelSpec,
  };
}

/**
 * Create a model spec string
 */
export function createModelSpec(provider: ProviderType, model: string): ModelSpec {
  return `${provider}:${model}` as ModelSpec;
}

// =============================================================================
// Edge-Native Generation
// =============================================================================

type GenerateFn = (model: string, messages: Array<{ role: string; content: string }>, apiKey: string, options: { temperature?: number; maxTokens?: number }) => Promise<{ text: string; usage?: { promptTokens: number; completionTokens: number } }>;

const PROVIDER_GENERATORS: Record<string, { keyField: keyof Credentials; fn: GenerateFn }> = {
  anthropic: { keyField: "anthropicApiKey", fn: generateWithAnthropic },
  openai: { keyField: "openaiApiKey", fn: generateWithOpenAI },
  groq: { keyField: "groqApiKey", fn: generateWithGroq },
  gemini: { keyField: "geminiApiKey", fn: generateWithGemini },
};

async function generateWithCloudflare(
  model: string,
  messages: Array<{ role: string; content: string }>,
  credentials: Credentials
): Promise<{ text: string; usage?: { promptTokens: number; completionTokens: number } }> {
  if (!credentials.cloudflareApiKey || !credentials.cloudflareEmail || !credentials.cloudflareAccountId) {
    throw new Error("Cloudflare models require cloudflareApiKey, cloudflareEmail, and cloudflareAccountId");
  }
  const result = await callCloudflareRest(model, messages, credentials);
  return {
    text: result.result.response || extractGptOssResponse(result),
    usage: result.result.usage ? {
      promptTokens: result.result.usage.prompt_tokens,
      completionTokens: result.result.usage.completion_tokens,
    } : undefined,
  };
}

/**
 * Generate text using any supported provider (edge-native)
 */
export async function generate(
  spec: ModelSpec | string,
  messages: Array<{ role: string; content: string }>,
  credentials: Credentials,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<{ text: string; usage?: { promptTokens: number; completionTokens: number } }> {
  const { provider, model } = parseModelSpec(spec);

  if (provider === "cloudflare") {
    return generateWithCloudflare(model, messages, credentials);
  }

  const config = PROVIDER_GENERATORS[provider];
  if (!config) throw new Error(`Unknown provider: ${provider}`);

  const apiKey = credentials[config.keyField];
  if (!apiKey) throw new Error(`${config.keyField} is required for ${provider} models`);

  return config.fn(model, messages, apiKey, options);
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Check if credentials are available for a provider
 */
export function hasCredentials(provider: ProviderType, credentials: Credentials): boolean {
  switch (provider) {
    case "anthropic":
      return !!credentials.anthropicApiKey;
    case "openai":
      return !!credentials.openaiApiKey;
    case "groq":
      return !!credentials.groqApiKey;
    case "gemini":
      return !!credentials.geminiApiKey;
    case "cloudflare":
      return !!(credentials.cloudflareApiKey && credentials.cloudflareEmail && credentials.cloudflareAccountId);
  }
}

/**
 * Get credentials from environment variables
 */
export function getCredentialsFromEnv(): Credentials {
  return {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
    groqApiKey: process.env.GROQ_API_KEY,
    geminiApiKey: process.env.GEMINI_API_KEY,
    cloudflareApiKey: process.env.CLOUDFLARE_API_KEY,
    cloudflareEmail: process.env.CLOUDFLARE_EMAIL,
    cloudflareAccountId: process.env.CLOUDFLARE_ACCOUNT_ID,
  };
}
