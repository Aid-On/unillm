/**
 * Gemini-specific streaming handlers
 *
 * Dedicated handlers for Google Gemini models with SSE streaming support.
 */

import type { StreamHandler } from "./streaming-handlers.js";

// =============================================================================
// Gemini Models
// =============================================================================

/**
 * Gemini 2.0 Flash handler
 */
export const gemini20FlashHandler: StreamHandler = {
  model: 'gemini-2.0-flash',
  async createStream(messages, apiKey, options = {}) {
    const contents = messages
      .filter(m => m.role !== "system")
      .map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const systemInstruction = messages.find(m => m.role === "system")?.content;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents,
          ...(systemInstruction && { systemInstruction: { parts: [{ text: systemInstruction }] } }),
          generationConfig: {
            temperature: options.temperature ?? 0.7,
            maxOutputTokens: options.maxTokens ?? 2048,
            topP: options.topP ?? 0.95,
            stopSequences: options.stopSequences,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini 2.0 Flash streaming failed: ${response.status}`);
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
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                controller.enqueue(text);
              }
            } catch { /* ignore parse errors */ }
          }
        }
      }));
  }
};

/**
 * Gemini 1.5 Flash handler
 */
export const gemini15FlashHandler: StreamHandler = {
  model: 'gemini-1.5-flash',
  async createStream(messages, apiKey, options = {}) {
    const contents = messages
      .filter(m => m.role !== "system")
      .map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const systemInstruction = messages.find(m => m.role === "system")?.content;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents,
          ...(systemInstruction && { systemInstruction: { parts: [{ text: systemInstruction }] } }),
          generationConfig: {
            temperature: options.temperature ?? 0.7,
            maxOutputTokens: options.maxTokens ?? 2048,
            topP: options.topP ?? 0.95,
            stopSequences: options.stopSequences,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini 1.5 Flash streaming failed: ${response.status}`);
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
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                controller.enqueue(text);
              }
            } catch { /* ignore parse errors */ }
          }
        }
      }));
  }
};
