/**
 * Groq-specific streaming handlers
 *
 * Dedicated handlers for Groq-hosted models including GPT-OSS and Llama variants.
 */

import type { StreamHandler } from "./streaming-handlers.js";

// =============================================================================
// Shared SSE Parsing for Groq (OpenAI-compatible format)
// =============================================================================

function extractDeltaContent(data: string): string | null {
  try {
    const parsed = JSON.parse(data);
    const content = parsed.choices?.[0]?.delta?.content;
    if (content !== undefined && content !== null) return content;
  } catch { /* ignore parse errors */ }
  return null;
}

function processSSELine(line: string, controller: TransformStreamDefaultController<string>): void {
  const trimmed = line.trim();
  if (!trimmed || !trimmed.startsWith('data: ')) return;
  const data = trimmed.slice(6);
  if (data === '[DONE]') return;
  const content = extractDeltaContent(data);
  if (content !== null) controller.enqueue(content);
}

function createGroqSSETransform(): TransformStream<string, string> {
  let buffer = '';
  return new TransformStream<string, string>({
    transform(chunk, controller) {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        processSSELine(line, controller);
      }
    },
    flush(controller) {
      const trimmed = buffer.trim();
      if (!trimmed) return;
      processSSELine(trimmed, controller);
    }
  });
}

// =============================================================================
// Shared Groq fetch + pipe
// =============================================================================

async function fetchGroqStream(
  model: string,
  apiKey: string | undefined,
  requestBody: Record<string, unknown>
): Promise<ReadableStream<string>> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${model} streaming failed: ${response.status} - ${errorText}`);
  }

  const body = response.body;
  if (!body) throw new Error(`No response body for ${model} streaming`);

  return body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(createGroqSSETransform());
}

// =============================================================================
// GPT-OSS Models (OpenAI Open Source on Groq)
// =============================================================================

/**
 * GPT-OSS-120B specific handler
 * This model needs special care for long outputs and may stop early
 */
export const gptOss120bHandler: StreamHandler = {
  model: 'openai/gpt-oss-120b',
  async createStream(messages, apiKey, options = {}) {
    return fetchGroqStream('openai/gpt-oss-120b', apiKey, {
      model: 'openai/gpt-oss-120b',
      messages,
      stream: true,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 8192,
      top_p: options.topP ?? 1.0,
      frequency_penalty: 0,
      presence_penalty: 0,
      stop: options.stopSequences === undefined ? [] : options.stopSequences,
      n: 1,
    });
  }
};

/**
 * GPT-OSS-20B specific handler
 */
export const gptOss20bHandler: StreamHandler = {
  model: 'openai/gpt-oss-20b',
  async createStream(messages, apiKey, options = {}) {
    return fetchGroqStream('openai/gpt-oss-20b', apiKey, {
      model: 'openai/gpt-oss-20b',
      messages,
      stream: true,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
      top_p: options.topP ?? 1.0,
      stop: options.stopSequences === undefined ? [] : options.stopSequences,
      n: 1,
    });
  }
};

// =============================================================================
// Llama Models
// =============================================================================

/**
 * Llama 3.1 8B Instant handler
 */
export const llama31InstantHandler: StreamHandler = {
  model: 'llama-3.1-8b-instant',
  async createStream(messages, apiKey, options = {}) {
    return fetchGroqStream('llama-3.1-8b-instant', apiKey, {
      model: 'llama-3.1-8b-instant',
      messages,
      stream: true,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
      stop: options.stopSequences,
    });
  }
};

/**
 * Llama 3.3 70B Versatile handler
 */
export const llama33VersatileHandler: StreamHandler = {
  model: 'llama-3.3-70b-versatile',
  async createStream(messages, apiKey, options = {}) {
    return fetchGroqStream('llama-3.3-70b-versatile', apiKey, {
      model: 'llama-3.3-70b-versatile',
      messages,
      stream: true,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
      stop: options.stopSequences,
    });
  }
};
