/**
 * Edge-Native Provider Factory Functions
 *
 * Pure fetch API implementation - no external dependencies
 * Optimized for edge computing environments
 */

import type {
  ModelSpec,
  ParsedModelSpec,
  ProviderType,
  Credentials,
} from "./types.js";

// =============================================================================
// Core API
// =============================================================================

/**
 * Parse a ModelSpec string into its components
 *
 * @example
 * parseModelSpec("groq:llama-3.1-8b-instant")
 * // => { provider: "groq", model: "llama-3.1-8b-instant", spec: "groq:llama-3.1-8b-instant" }
 */
export function parseModelSpec(spec: string): ParsedModelSpec {
  const colonIndex = spec.indexOf(":");
  if (colonIndex === -1) {
    throw new Error(`Invalid ModelSpec: "${spec}". Expected format: "provider:model"`);
  }

  const provider = spec.slice(0, colonIndex) as ProviderType;
  const model = spec.slice(colonIndex + 1);

  if (!["openai", "groq", "gemini", "cloudflare"].includes(provider)) {
    throw new Error(`Unknown provider: "${provider}". Expected: openai, groq, gemini, or cloudflare`);
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

// =============================================================================
// Edge-Native LLM API Functions
// =============================================================================

/**
 * Generate text using OpenAI API (edge-native)
 */
export async function generateWithOpenAI(
  model: string,
  messages: Array<{ role: string; content: string }>,
  apiKey: string,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<{ text: string; usage?: { promptTokens: number; completionTokens: number } }> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${text}`);
  }

  const result = await response.json() as any;
  return {
    text: result.choices?.[0]?.message?.content || "",
    usage: result.usage ? {
      promptTokens: result.usage.prompt_tokens,
      completionTokens: result.usage.completion_tokens,
    } : undefined,
  };
}

/**
 * Generate text using Groq API (edge-native)
 */
export async function generateWithGroq(
  model: string,
  messages: Array<{ role: string; content: string }>,
  apiKey: string,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<{ text: string; usage?: { promptTokens: number; completionTokens: number } }> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Groq API error: ${response.status} ${text}`);
  }

  const result = await response.json() as any;
  return {
    text: result.choices?.[0]?.message?.content || "",
    usage: result.usage ? {
      promptTokens: result.usage.prompt_tokens,
      completionTokens: result.usage.completion_tokens,
    } : undefined,
  };
}

/**
 * Generate text using Gemini API (edge-native)
 */
export async function generateWithGemini(
  model: string,
  messages: Array<{ role: string; content: string }>,
  apiKey: string,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<{ text: string; usage?: { promptTokens: number; completionTokens: number } }> {
  // Convert messages to Gemini format
  const contents = messages
    .filter(m => m.role !== "system")
    .map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const systemInstruction = messages.find(m => m.role === "system")?.content;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents,
        ...(systemInstruction && { systemInstruction: { parts: [{ text: systemInstruction }] } }),
        generationConfig: {
          temperature: options.temperature || 0.7,
          maxOutputTokens: options.maxTokens,
        },
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${text}`);
  }

  const result = await response.json() as any;
  return {
    text: result.candidates?.[0]?.content?.parts?.[0]?.text || "",
    usage: result.usageMetadata ? {
      promptTokens: result.usageMetadata.promptTokenCount,
      completionTokens: result.usageMetadata.candidatesTokenCount,
    } : undefined,
  };
}

/**
 * Create a model spec string
 */
export function createModelSpec(provider: ProviderType, model: string): ModelSpec {
  return `${provider}:${model}` as ModelSpec;
}

// =============================================================================
// Edge-Native Generation Functions
// =============================================================================

/**
 * Generate text using any supported provider (edge-native)
 *
 * @example
 * ```typescript
 * const result = await generate("groq:llama-3.1-8b-instant", messages, {
 *   groqApiKey: process.env.GROQ_API_KEY,
 * });
 * ```
 */
export async function generate(
  spec: ModelSpec | string,
  messages: Array<{ role: string; content: string }>,
  credentials: Credentials,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<{ text: string; usage?: { promptTokens: number; completionTokens: number } }> {
  const { provider, model } = parseModelSpec(spec);

  switch (provider) {
    case "openai": {
      if (!credentials.openaiApiKey) {
        throw new Error("openaiApiKey is required for OpenAI models");
      }
      return generateWithOpenAI(model, messages, credentials.openaiApiKey, options);
    }

    case "groq": {
      if (!credentials.groqApiKey) {
        throw new Error("groqApiKey is required for Groq models");
      }
      return generateWithGroq(model, messages, credentials.groqApiKey, options);
    }

    case "gemini": {
      if (!credentials.geminiApiKey) {
        throw new Error("geminiApiKey is required for Gemini models");
      }
      return generateWithGemini(model, messages, credentials.geminiApiKey, options);
    }

    case "cloudflare": {
      if (credentials.cloudflareApiKey && credentials.cloudflareEmail && credentials.cloudflareAccountId) {
        const result = await callCloudflareRest(model, messages, credentials);
        return {
          text: result.result.response || extractGptOssResponse(result),
          usage: result.result.usage ? {
            promptTokens: result.result.usage.prompt_tokens,
            completionTokens: result.result.usage.completion_tokens,
          } : undefined,
        };
      } else {
        throw new Error("Cloudflare models require cloudflareApiKey, cloudflareEmail, and cloudflareAccountId");
      }
    }

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Extract response text from gpt-oss format
 */
function extractGptOssResponse(result: any): string {
  if (result.result?.output) {
    const assistantMessage = result.result.output.find((o: any) => o.type === "message" && o.role === "assistant");
    return assistantMessage?.content?.[0]?.text || "";
  }
  return result.result?.response || "";
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Check if credentials are available for a provider
 */
export function hasCredentials(provider: ProviderType, credentials: Credentials): boolean {
  switch (provider) {
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
    openaiApiKey: process.env.OPENAI_API_KEY,
    groqApiKey: process.env.GROQ_API_KEY,
    geminiApiKey: process.env.GEMINI_API_KEY,
    cloudflareApiKey: process.env.CLOUDFLARE_API_KEY,
    cloudflareEmail: process.env.CLOUDFLARE_EMAIL,
    cloudflareAccountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    // Note: cloudflareBinding not supported in edge-native version
  };
}

// =============================================================================
// Cloudflare REST API (for CLI testing)
// =============================================================================

export interface CloudflareRestResponse {
  result: {
    response: string;
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  };
  success: boolean;
  errors: unknown[];
  messages: unknown[];
}

/**
 * Call Cloudflare Workers AI via REST API
 * Use this for CLI testing when no Worker binding is available.
 */
export async function callCloudflareRest(
  model: string,
  messages: Array<{ role: string; content: string }>,
  credentials: Credentials
): Promise<CloudflareRestResponse> {
  const { cloudflareApiKey, cloudflareEmail, cloudflareAccountId } = credentials;

  if (!cloudflareApiKey || !cloudflareEmail || !cloudflareAccountId) {
    throw new Error("Cloudflare REST API requires cloudflareApiKey, cloudflareEmail, and cloudflareAccountId");
  }

  // Different models use different input formats
  let requestBody: any;
  if (model.includes("gpt-oss")) {
    // gpt-oss models use input format
    const userMessage = messages.find(m => m.role === "user")?.content || "";
    const systemMessage = messages.find(m => m.role === "system")?.content || "";
    
    requestBody = {
      input: userMessage,
      ...(systemMessage && { instructions: systemMessage })
    };
  } else {
    // Other models use messages format
    requestBody = { messages };
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/ai/run/${model}`,
    {
      method: "POST",
      headers: {
        "X-Auth-Email": cloudflareEmail,
        "X-Auth-Key": cloudflareApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cloudflare API error: ${response.status} ${text}`);
  }

  return response.json();
}

/**
 * Call Cloudflare Workers AI via REST API with streaming
 * Returns an async generator that yields response chunks.
 *
 * @example
 * ```typescript
 * for await (const chunk of callCloudflareRestStream(model, messages, credentials)) {
 *   process.stdout.write(chunk);
 * }
 * ```
 */
export async function* callCloudflareRestStream(
  model: string,
  messages: Array<{ role: string; content: string }>,
  credentials: Credentials
): AsyncGenerator<string, void, unknown> {
  const { cloudflareApiKey, cloudflareEmail, cloudflareAccountId } = credentials;

  if (!cloudflareApiKey || !cloudflareEmail || !cloudflareAccountId) {
    throw new Error("Cloudflare REST API requires cloudflareApiKey, cloudflareEmail, and cloudflareAccountId");
  }

  // Different models use different input formats
  let requestBody: any;
  if (model.includes("gpt-oss")) {
    // gpt-oss models use input format
    const userMessage = messages.find(m => m.role === "user")?.content || "";
    const systemMessage = messages.find(m => m.role === "system")?.content || "";
    
    requestBody = {
      input: userMessage,
      stream: true,
      ...(systemMessage && { instructions: systemMessage })
    };
  } else {
    // Other models use messages format
    requestBody = { 
      messages, 
      stream: true,
      // Add max_tokens for Qwen models to prevent empty responses
      ...(model.includes('qwen') && { max_tokens: 1024 })
    };
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/ai/run/${model}`,
    {
      method: "POST",
      headers: {
        "X-Auth-Email": cloudflareEmail,
        "X-Auth-Key": cloudflareApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cloudflare API error: ${response.status} ${text}`);
  }

  if (!response.body) {
    throw new Error("No response body for streaming");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Process SSE lines
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? ""; // Keep incomplete line in buffer

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;

      const data = trimmed.slice(6); // Remove "data: " prefix
      if (data === "[DONE]") return;

      try {
        const parsed = JSON.parse(data);
        // Handle response field - skip empty strings for models like Llama 4 Scout
        if (parsed.response !== undefined && parsed.response !== "") {
          yield parsed.response;
        }
      } catch {
        // Skip malformed JSON
      }
    }
  }
}

// =============================================================================
// Cloudflare REST Model Implementation
// =============================================================================

// Cloudflare REST model implementation removed - use generate() function instead
