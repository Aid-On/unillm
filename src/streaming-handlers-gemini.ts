/**
 * Gemini-specific streaming handlers
 *
 * Dedicated handlers for Google Gemini models with SSE streaming support.
 */

import type { StreamHandler, StreamOptions } from "./streaming-handlers.js";

// =============================================================================
// Shared Gemini SSE Parsing
// =============================================================================

function extractGeminiText(data: string): string | null {
  try {
    const parsed = JSON.parse(data);
    const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) return text;
  } catch { /* ignore parse errors */ }
  return null;
}

function processSSELine(line: string, controller: TransformStreamDefaultController<string>): void {
  const trimmed = line.trim();
  if (!trimmed || !trimmed.startsWith('data: ')) return;
  const data = trimmed.slice(6);
  if (data === '[DONE]') return;
  const text = extractGeminiText(data);
  if (text) controller.enqueue(text);
}

function createGeminiSSETransform(): TransformStream<string, string> {
  let buffer = '';
  return new TransformStream<string, string>({
    transform(chunk, controller) {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        processSSELine(line, controller);
      }
    }
  });
}

// =============================================================================
// Shared Gemini fetch + pipe
// =============================================================================

function buildGeminiContents(messages: Array<{ role: string; content: string }>): Array<{ role: string; parts: Array<{ text: string }> }> {
  return messages
    .filter(m => m.role !== "system")
    .map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
}

function findSystemInstruction(messages: Array<{ role: string; content: string }>): string | undefined {
  return messages.find(m => m.role === "system")?.content;
}

async function fetchGeminiStream(
  modelName: string,
  messages: Array<{ role: string; content: string }>,
  apiKey: string | undefined,
  options: StreamOptions
): Promise<ReadableStream<string>> {
  const contents = buildGeminiContents(messages);
  const systemInstruction = findSystemInstruction(messages);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        ...(systemInstruction && { systemInstruction: { parts: [{ text: systemInstruction }] } }),
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxTokens ?? 2048,
          topP: options.topP ?? 0.95,
          // null は JSON にそのまま載って 400 になり得るため undefined に正規化
          stopSequences: options.stopSequences ?? undefined,
          // 2.5 系の思考モードは maxOutputTokens を消費し品質劣化を招くため無効化
          // （text-smash の llm-provider-gemini.ts と同じ判断）
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`${modelName} streaming failed: ${response.status}`);
  }

  const body = response.body;
  if (!body) throw new Error(`No response body for ${modelName} streaming`);

  return body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(createGeminiSSETransform());
}

// =============================================================================
// Gemini Models
// =============================================================================

/**
 * Gemini 2.5 Flash handler
 *
 * 旧 2.0/1.5 系ハンドラは Google 側のモデル廃止（404）に伴い削除。
 */
export const gemini25FlashHandler: StreamHandler = {
  model: 'gemini-2.5-flash',
  async createStream(messages, apiKey, options = {}) {
    return fetchGeminiStream('gemini-2.5-flash', messages, apiKey, options);
  }
};

/**
 * Gemini 2.5 Flash Lite handler
 */
export const gemini25FlashLiteHandler: StreamHandler = {
  model: 'gemini-2.5-flash-lite',
  async createStream(messages, apiKey, options = {}) {
    return fetchGeminiStream('gemini-2.5-flash-lite', messages, apiKey, options);
  }
};
