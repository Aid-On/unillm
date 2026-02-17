/**
 * Cloudflare Workers AI Model Definitions
 *
 * Cloudflare Workers AI model metadata for all supported models.
 */

import type { ModelInfo } from "./types.js";

/**
 * Cloudflare Workers AI models (verified 2025-01-15)
 */
export const CLOUDFLARE_MODELS: ModelInfo[] = [
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
];
