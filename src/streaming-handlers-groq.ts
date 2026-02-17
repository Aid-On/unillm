/**
 * Groq-specific streaming handlers
 *
 * Dedicated handlers for Groq-hosted models including GPT-OSS and Llama variants.
 */

import type { StreamHandler } from "./streaming-handlers.js";

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
    const requestBody = {
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
    };

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
      throw new Error(`GPT-OSS-120B streaming failed: ${response.status} - ${errorText}`);
    }

    let buffer = '';

    return response.body!
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new TransformStream<string, string>({
        transform(chunk, controller) {
          buffer += chunk;
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;

            const data = trimmed.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content !== undefined && content !== null) {
                controller.enqueue(content);
              }
            } catch { /* ignore parse errors */ }
          }
        },

        flush(controller) {
          if (buffer.trim()) {
            if (buffer.trim().startsWith('data: ')) {
              const data = buffer.trim().slice(6);
              if (data !== '[DONE]') {
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    controller.enqueue(content);
                  }
                } catch { /* ignore incomplete chunk */ }
              }
            }
          }
        }
      }));
  }
};

/**
 * GPT-OSS-20B specific handler
 */
export const gptOss20bHandler: StreamHandler = {
  model: 'openai/gpt-oss-20b',
  async createStream(messages, apiKey, options = {}) {
    const requestBody = {
      model: 'openai/gpt-oss-20b',
      messages,
      stream: true,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
      top_p: options.topP ?? 1.0,
      stop: options.stopSequences === undefined ? [] : options.stopSequences,
      n: 1,
    };

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`GPT-OSS-20B streaming failed: ${response.status}`);
    }

    let buffer = '';
    return response.body!
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new TransformStream<string, string>({
        transform(chunk, controller) {
          buffer += chunk;
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;

            const data = trimmed.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content !== undefined && content !== null) {
                controller.enqueue(content);
              }
            } catch { /* ignore parse errors */ }
          }
        }
      }));
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
    const requestBody = {
      model: 'llama-3.1-8b-instant',
      messages,
      stream: true,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
      stop: options.stopSequences,
    };

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Llama 3.1 8B streaming failed: ${response.status}`);
    }

    let buffer = '';
    return response.body!
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new TransformStream<string, string>({
        transform(chunk, controller) {
          buffer += chunk;
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;

            const data = trimmed.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content !== undefined && content !== null) {
                controller.enqueue(content);
              }
            } catch { /* ignore parse errors */ }
          }
        }
      }));
  }
};

/**
 * Llama 3.3 70B Versatile handler
 */
export const llama33VersatileHandler: StreamHandler = {
  model: 'llama-3.3-70b-versatile',
  async createStream(messages, apiKey, options = {}) {
    const requestBody = {
      model: 'llama-3.3-70b-versatile',
      messages,
      stream: true,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
      stop: options.stopSequences,
    };

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Llama 3.3 70B streaming failed: ${response.status}`);
    }

    let buffer = '';
    return response.body!
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new TransformStream<string, string>({
        transform(chunk, controller) {
          buffer += chunk;
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;

            const data = trimmed.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content !== undefined && content !== null) {
                controller.enqueue(content);
              }
            } catch { /* ignore parse errors */ }
          }
        }
      }));
  }
};
