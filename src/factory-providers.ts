/**
 * Provider-Specific Factory Functions
 *
 * Edge-native implementations for each LLM provider's API.
 * Each function uses pure fetch API with no external dependencies.
 */

// =============================================================================
// Response Types
// =============================================================================

interface ProviderResponse {
  text: string;
  usage?: { promptTokens: number; completionTokens: number };
}

interface AnthropicApiResponse {
  content?: Array<{ text?: string }>;
  usage?: { input_tokens: number; output_tokens: number };
}

interface OpenAIApiResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens: number; completion_tokens: number };
}

interface GeminiApiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  usageMetadata?: { promptTokenCount: number; candidatesTokenCount: number };
}

// =============================================================================
// Anthropic
// =============================================================================

export async function generateWithAnthropic(
  model: string,
  messages: Array<{ role: string; content: string }>,
  apiKey: string,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ProviderResponse> {
  const anthropicMessages = messages.map(msg => ({
    role: msg.role === "user" ? "user" : "assistant",
    content: msg.content,
  }));

  const systemIndex = messages.findIndex(m => m.role === "system");
  const system = systemIndex >= 0 ? messages[systemIndex].content : undefined;
  const finalMessages = systemIndex >= 0
    ? anthropicMessages.filter((_, i) => i !== systemIndex)
    : anthropicMessages;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model, messages: finalMessages, system,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature || 0.7,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Anthropic API error: ${response.status} ${text}`);
  }

  const result = await response.json() as AnthropicApiResponse;
  return {
    text: result.content?.[0]?.text || "",
    usage: result.usage ? {
      promptTokens: result.usage.input_tokens,
      completionTokens: result.usage.output_tokens,
    } : undefined,
  };
}

// =============================================================================
// OpenAI
// =============================================================================

export async function generateWithOpenAI(
  model: string,
  messages: Array<{ role: string; content: string }>,
  apiKey: string,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ProviderResponse> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model, messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${text}`);
  }

  const result = await response.json() as OpenAIApiResponse;
  return {
    text: result.choices?.[0]?.message?.content || "",
    usage: result.usage ? {
      promptTokens: result.usage.prompt_tokens,
      completionTokens: result.usage.completion_tokens,
    } : undefined,
  };
}

// =============================================================================
// Groq
// =============================================================================

export async function generateWithGroq(
  model: string,
  messages: Array<{ role: string; content: string }>,
  apiKey: string,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ProviderResponse> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model, messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Groq API error: ${response.status} ${text}`);
  }

  const result = await response.json() as OpenAIApiResponse;
  return {
    text: result.choices?.[0]?.message?.content || "",
    usage: result.usage ? {
      promptTokens: result.usage.prompt_tokens,
      completionTokens: result.usage.completion_tokens,
    } : undefined,
  };
}

// =============================================================================
// Gemini
// =============================================================================

export async function generateWithGemini(
  model: string,
  messages: Array<{ role: string; content: string }>,
  apiKey: string,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ProviderResponse> {
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
      headers: { "Content-Type": "application/json" },
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

  const result = await response.json() as GeminiApiResponse;
  return {
    text: result.candidates?.[0]?.content?.parts?.[0]?.text || "",
    usage: result.usageMetadata ? {
      promptTokens: result.usageMetadata.promptTokenCount,
      completionTokens: result.usageMetadata.candidatesTokenCount,
    } : undefined,
  };
}

// Re-export Cloudflare functions
export {
  callCloudflareRest,
  callCloudflareRestStream,
  extractGptOssResponse,
} from "./factory-cloudflare.js";

export type { CloudflareRestResponse } from "./factory-cloudflare.js";
