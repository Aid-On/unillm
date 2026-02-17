/**
 * Fluent API - Streaming Implementation Functions
 *
 * Provider-specific streaming implementations for the fluent builder.
 * Creates ReadableStream<string> for each provider's streaming API.
 */

import type { Credentials } from "./types.js";
import { callCloudflareRestStream } from "./factory.js";
import { getStreamHandler } from "./streaming-handlers.js";

// =============================================================================
// Provider Stream Router
// =============================================================================

interface ProviderStreamConfig {
  provider: string;
  model: string;
  messages: Array<{ role: string; content: string }>;
  credentials: Credentials;
  options?: { temperature?: number; maxTokens?: number };
}

export async function createProviderStream(config: ProviderStreamConfig): Promise<ReadableStream<string>> {
  const { provider, model, messages, credentials, options } = config;
  return routeToProvider(provider, model, messages, credentials, options);
}

function getApiKeyOrThrow(credentials: Credentials, provider: string): string {
  const keyMap: Record<string, string | undefined> = {
    anthropic: credentials.anthropicApiKey,
    openai: credentials.openaiApiKey,
    groq: credentials.groqApiKey,
    gemini: credentials.geminiApiKey,
  };
  const key = keyMap[provider];
  if (!key) throw new Error(`${provider}ApiKey is required for ${provider} streaming`);
  return key;
}

async function routeToProvider(provider: string, model: string, messages: Array<{ role: string; content: string }>, credentials: Credentials, options?: { temperature?: number; maxTokens?: number }): Promise<ReadableStream<string>> {
  if (provider === "cloudflare") {
    return createCloudflareReadableStream(model, messages, credentials);
  }
  const apiKey = getApiKeyOrThrow(credentials, provider);
  if (provider === "groq" || provider === "gemini") {
    const handler = getStreamHandler(model);
    if (handler) return handler.createStream(messages, apiKey, options);
  }
  const streamFn = STREAM_CREATORS[provider];
  if (!streamFn) throw new Error(`Streaming not supported for provider: ${provider}`);
  return streamFn(model, messages, apiKey, options);
}

function createCloudflareReadableStream(model: string, messages: Array<{ role: string; content: string }>, credentials: Credentials): ReadableStream<string> {
  if (!credentials.cloudflareApiKey || !credentials.cloudflareEmail || !credentials.cloudflareAccountId) {
    throw new Error("Cloudflare credentials required for streaming");
  }
  const iter = callCloudflareRestStream(model, messages, credentials);
  return new ReadableStream<string>({
    async start(controller) {
      try {
        for await (const chunk of iter) { controller.enqueue(chunk); }
        controller.close();
      } catch (error) { controller.error(error); }
    }
  });
}

type StreamCreator = (model: string, messages: Array<{ role: string; content: string }>, apiKey: string, options?: { temperature?: number; maxTokens?: number }) => Promise<ReadableStream<string>>;

const STREAM_CREATORS: Record<string, StreamCreator> = {
  anthropic: createAnthropicStream,
  openai: createOpenAIStream,
  groq: createGroqStream,
  gemini: createGeminiStream,
};

// =============================================================================
// Shared SSE Parsing
// =============================================================================

type ContentExtractor = (parsed: Record<string, unknown>) => string | null;

function createSSETransform(extract: ContentExtractor): TransformStream<string, string> {
  let buffer = '';
  return new TransformStream({
    transform(chunk, controller) {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') continue;
        try {
          const content = extract(JSON.parse(data));
          if (content) controller.enqueue(content);
        } catch { /* ignore parse errors */ }
      }
    },
    flush(controller) {
      if (buffer.trim().startsWith('data: ')) {
        const data = buffer.trim().slice(6);
        if (data !== '[DONE]') {
          try {
            const content = extract(JSON.parse(data));
            if (content) controller.enqueue(content);
          } catch { /* ignore incomplete final chunk */ }
        }
      }
    }
  });
}

const extractOpenAI: ContentExtractor = (p) => {
  const choices = p.choices as Array<Record<string, unknown>> | undefined;
  const delta = choices?.[0]?.delta as Record<string, unknown> | undefined;
  return (delta?.content as string) || null;
};

const extractGemini: ContentExtractor = (p) => {
  const candidates = p.candidates as Array<Record<string, unknown>> | undefined;
  const content = candidates?.[0]?.content as Record<string, unknown> | undefined;
  const parts = content?.parts as Array<Record<string, unknown>> | undefined;
  return (parts?.[0]?.text as string) || null;
};

const extractAnthropic: ContentExtractor = (p) => {
  if (p.type === 'content_block_delta') {
    const delta = p.delta as Record<string, unknown> | undefined;
    return (delta?.text as string) || null;
  }
  return null;
};

const extractGroq: ContentExtractor = (p) => {
  return extractOpenAI(p) || (p.response as string) || null;
};

// =============================================================================
// Model Configs
// =============================================================================

const MODEL_CONFIGS: Record<string, { maxTokens: number; temperature?: number; topP?: number; stopSequences?: string[] | null }> = {
  'openai/gpt-oss-120b': { maxTokens: 4096, temperature: 0.7, topP: 1.0, stopSequences: null },
  'openai/gpt-oss-20b': { maxTokens: 4096, temperature: 0.7, topP: 1.0, stopSequences: null },
  'llama-3.1-8b-instant': { maxTokens: 2048, temperature: 0.7 },
  'llama-3.3-70b-versatile': { maxTokens: 2048, temperature: 0.7 },
  'mixtral-8x7b-32768': { maxTokens: 32768, temperature: 0.7 },
  'gemma2-9b-it': { maxTokens: 2048, temperature: 0.7 },
};

export function getModelConfig(model: string) {
  const c = MODEL_CONFIGS[model] || {};
  return { maxTokens: c.maxTokens || 2048, temperature: c.temperature || 0.7, topP: c.topP, stopSequences: c.stopSequences };
}

// =============================================================================
// Provider Streaming Functions
// =============================================================================

async function fetchAndPipeSSE(url: string, headers: Record<string, string>, body: Record<string, unknown>, extract: ContentExtractor): Promise<ReadableStream<string>> {
  const response = await fetch(url, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Streaming failed: ${response.status} - ${errorText}`);
  }
  if (!response.body) throw new Error("No response body for streaming");
  return response.body.pipeThrough(new TextDecoderStream()).pipeThrough(createSSETransform(extract));
}

export async function createAnthropicStream(model: string, messages: Array<{ role: string; content: string }>, apiKey: string, options?: { temperature?: number; maxTokens?: number }): Promise<ReadableStream<string>> {
  const anthropicMessages = messages.filter(m => m.role !== "system").map(msg => ({ role: msg.role === "user" ? "user" : "assistant", content: msg.content }));
  const system = messages.find(m => m.role === "system")?.content;
  return fetchAndPipeSSE("https://api.anthropic.com/v1/messages", { "x-api-key": apiKey, "anthropic-version": "2023-06-01" }, { model, messages: anthropicMessages, system, max_tokens: options?.maxTokens || 4096, temperature: options?.temperature || 0.7, stream: true }, extractAnthropic);
}

export async function createOpenAIStream(model: string, messages: Array<{ role: string; content: string }>, apiKey: string, options?: { temperature?: number; maxTokens?: number }): Promise<ReadableStream<string>> {
  return fetchAndPipeSSE("https://api.openai.com/v1/chat/completions", { "Authorization": `Bearer ${apiKey}` }, { model, messages, stream: true, temperature: options?.temperature || 0.7, max_tokens: options?.maxTokens }, extractOpenAI);
}

export async function createGroqStream(model: string, messages: Array<{ role: string; content: string }>, apiKey: string, options?: { temperature?: number; maxTokens?: number }): Promise<ReadableStream<string>> {
  const config = getModelConfig(model);
  const body: Record<string, unknown> = { model, messages, stream: true, temperature: options?.temperature ?? config.temperature, max_tokens: options?.maxTokens ?? config.maxTokens };
  if (config.topP !== undefined) body.top_p = config.topP;
  if (config.stopSequences !== undefined) body.stop = config.stopSequences;
  return fetchAndPipeSSE("https://api.groq.com/openai/v1/chat/completions", { "Authorization": `Bearer ${apiKey}` }, body, extractGroq);
}

export async function createGeminiStream(model: string, messages: Array<{ role: string; content: string }>, apiKey: string, options?: { temperature?: number; maxTokens?: number }): Promise<ReadableStream<string>> {
  const contents = messages.filter(m => m.role !== "system").map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
  const systemInstruction = messages.find(m => m.role === "system")?.content;
  return fetchAndPipeSSE(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`, {}, { contents, ...(systemInstruction && { systemInstruction: { parts: [{ text: systemInstruction }] } }), generationConfig: { temperature: options?.temperature ?? 0.7, maxOutputTokens: options?.maxTokens ?? 2048 } }, extractGemini);
}
