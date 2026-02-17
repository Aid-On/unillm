/**
 * Fluent API - Provider-Specific Shortcuts
 *
 * Pre-configured builder shortcuts for each LLM provider.
 * Provides ergonomic access to common models.
 */

import type { Stream } from "@aid-on/nagare";
import { quick } from "./fluent.js";

// =============================================================================
// Provider-Specific Shortcuts
// =============================================================================

/**
 * Anthropic-specific builder shortcuts with streaming support
 */
export const anthropic = {
  /** Claude 4.5 Sonnet - Latest 2025, most capable */
  sonnet: (apiKey: string) => Object.assign(quick("anthropic:claude-sonnet-4-5-20250929", { anthropicApiKey: apiKey }), {
    stream: async (prompt: string): Promise<Stream<string>> => {
      const builder = quick("anthropic:claude-sonnet-4-5-20250929", { anthropicApiKey: apiKey });
      return builder.stream(prompt);
    }
  }),

  /** Claude 3.5 Haiku - Fast and cheap */
  haiku: (apiKey: string) => Object.assign(quick("anthropic:claude-3-5-haiku-20241022", { anthropicApiKey: apiKey }), {
    stream: async (prompt: string): Promise<Stream<string>> => {
      const builder = quick("anthropic:claude-3-5-haiku-20241022", { anthropicApiKey: apiKey });
      return builder.stream(prompt);
    }
  }),
};

/**
 * OpenAI-specific builder shortcuts with streaming support
 */
export const openai = {
  /** GPT-4o - Latest and fastest */
  gpt4o: (apiKey: string) => Object.assign(quick("openai:gpt-4o", { openaiApiKey: apiKey }), {
    stream: async (prompt: string): Promise<Stream<string>> => {
      const builder = quick("openai:gpt-4o", { openaiApiKey: apiKey });
      return builder.stream(prompt);
    }
  }),

  /** GPT-4o Mini - Cost-effective */
  mini: (apiKey: string) => Object.assign(quick("openai:gpt-4o-mini", { openaiApiKey: apiKey }), {
    stream: async (prompt: string): Promise<Stream<string>> => {
      const builder = quick("openai:gpt-4o-mini", { openaiApiKey: apiKey });
      return builder.stream(prompt);
    }
  }),

  /** GPT-4 Turbo - High capability */
  turbo: (apiKey: string) => Object.assign(quick("openai:gpt-4-turbo", { openaiApiKey: apiKey }), {
    stream: async (prompt: string): Promise<Stream<string>> => {
      const builder = quick("openai:gpt-4-turbo", { openaiApiKey: apiKey });
      return builder.stream(prompt);
    }
  }),

  /** GPT-3.5 Turbo - Fast and cheap */
  gpt35: (apiKey: string) => Object.assign(quick("openai:gpt-3.5-turbo", { openaiApiKey: apiKey }), {
    stream: async (prompt: string): Promise<Stream<string>> => {
      const builder = quick("openai:gpt-3.5-turbo", { openaiApiKey: apiKey });
      return builder.stream(prompt);
    }
  }),
};

/**
 * Groq-specific builder shortcuts with streaming support
 */
export const groq = {
  /** Fastest model - 560 tokens/sec */
  instant: (apiKey: string) => Object.assign(quick("groq:llama-3.1-8b-instant", { groqApiKey: apiKey }), {
    stream: async (prompt: string): Promise<Stream<string>> => {
      const builder = quick("groq:llama-3.1-8b-instant", { groqApiKey: apiKey });
      return builder.stream(prompt);
    }
  }),

  /** Balanced model - 280 tokens/sec */
  versatile: (apiKey: string) => Object.assign(quick("groq:llama-3.3-70b-versatile", { groqApiKey: apiKey }), {
    stream: async (prompt: string): Promise<Stream<string>> => {
      const builder = quick("groq:llama-3.3-70b-versatile", { groqApiKey: apiKey });
      return builder.stream(prompt);
    }
  }),

  /** OpenAI OSS models */
  gpt120b: (apiKey: string) => Object.assign(quick("groq:openai/gpt-oss-120b", { groqApiKey: apiKey }), {
    stream: async (prompt: string): Promise<Stream<string>> => {
      const builder = quick("groq:openai/gpt-oss-120b", { groqApiKey: apiKey });
      return builder.stream(prompt);
    }
  }),

  gpt20b: (apiKey: string) => Object.assign(quick("groq:openai/gpt-oss-20b", { groqApiKey: apiKey }), {
    stream: async (prompt: string): Promise<Stream<string>> => {
      const builder = quick("groq:openai/gpt-oss-20b", { groqApiKey: apiKey });
      return builder.stream(prompt);
    }
  }),

  /** Specialized models */
  guard: (apiKey: string) => quick("groq:meta-llama/llama-guard-4-12b", { groqApiKey: apiKey }),
  compound: (apiKey: string) => quick("groq:groq/compound", { groqApiKey: apiKey }),
  compoundMini: (apiKey: string) => quick("groq:groq/compound-mini", { groqApiKey: apiKey }),
};

/**
 * Gemini-specific builder shortcuts
 */
export const gemini = {
  /** Latest Gemini 3 series */
  pro3: (apiKey: string) => quick("gemini:gemini-3-pro-preview", { geminiApiKey: apiKey }),
  flash3: (apiKey: string) => quick("gemini:gemini-3-flash-preview", { geminiApiKey: apiKey }),

  /** Gemini 2.5 series */
  pro25: (apiKey: string) => quick("gemini:gemini-2.5-pro", { geminiApiKey: apiKey }),
  flash25: (apiKey: string) => quick("gemini:gemini-2.5-flash", { geminiApiKey: apiKey }),

  /** Gemini 2.0 series (recommended) */
  flash: (apiKey: string) => quick("gemini:gemini-2.0-flash", { geminiApiKey: apiKey }),
  lite: (apiKey: string) => quick("gemini:gemini-2.0-flash-lite", { geminiApiKey: apiKey }),

  /** Stable 1.5 series */
  pro: (apiKey: string) => quick("gemini:gemini-1.5-pro-002", { geminiApiKey: apiKey }),
  flash15: (apiKey: string) => quick("gemini:gemini-1.5-flash-002", { geminiApiKey: apiKey }),
};

/**
 * Cloudflare-specific builder shortcuts
 */
export const cloudflare = {
  /** GPT-OSS 120B - Production use */
  gpt120b: (creds: { apiKey: string; email: string; accountId: string }) =>
    quick("cloudflare:@cf/openai/gpt-oss-120b", {
      cloudflareApiKey: creds.apiKey,
      cloudflareEmail: creds.email,
      cloudflareAccountId: creds.accountId,
    }),

  /** GPT-OSS 20B - Lower latency */
  gpt20b: (creds: { apiKey: string; email: string; accountId: string }) =>
    quick("cloudflare:@cf/openai/gpt-oss-20b", {
      cloudflareApiKey: creds.apiKey,
      cloudflareEmail: creds.email,
      cloudflareAccountId: creds.accountId,
    }),

  /** Llama 4 Scout - Multimodal */
  llama4: (creds: { apiKey: string; email: string; accountId: string }) =>
    quick("cloudflare:@cf/meta/llama-4-scout-17b-16e-instruct", {
      cloudflareApiKey: creds.apiKey,
      cloudflareEmail: creds.email,
      cloudflareAccountId: creds.accountId,
    }),

  /** Llama 3.3 70B - Fast quantized */
  llama70b: (creds: { apiKey: string; email: string; accountId: string }) =>
    quick("cloudflare:@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
      cloudflareApiKey: creds.apiKey,
      cloudflareEmail: creds.email,
      cloudflareAccountId: creds.accountId,
    }),

  /** Llama 3.1 8B - Lightweight */
  llama8b: (creds: { apiKey: string; email: string; accountId: string }) =>
    quick("cloudflare:@cf/meta/llama-3.1-8b-instruct", {
      cloudflareApiKey: creds.apiKey,
      cloudflareEmail: creds.email,
      cloudflareAccountId: creds.accountId,
    }),

  /** QwQ 32B - Reasoning specialist */
  reasoning: (creds: { apiKey: string; email: string; accountId: string }) =>
    quick("cloudflare:@cf/qwen/qwq-32b", {
      cloudflareApiKey: creds.apiKey,
      cloudflareEmail: creds.email,
      cloudflareAccountId: creds.accountId,
    }),

  /** Qwen 2.5 Coder - Code specialist */
  coder: (creds: { apiKey: string; email: string; accountId: string }) =>
    quick("cloudflare:@cf/qwen/qwen2.5-coder-32b-instruct", {
      cloudflareApiKey: creds.apiKey,
      cloudflareEmail: creds.email,
      cloudflareAccountId: creds.accountId,
    }),

  /** IBM Granite - Enterprise */
  granite: (creds: { apiKey: string; email: string; accountId: string }) =>
    quick("cloudflare:@cf/ibm/granite-4.0-h-micro", {
      cloudflareApiKey: creds.apiKey,
      cloudflareEmail: creds.email,
      cloudflareAccountId: creds.accountId,
    }),
};
