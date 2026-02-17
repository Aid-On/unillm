/**
 * Cloudflare Workers AI REST API
 *
 * Edge-native implementation for Cloudflare Workers AI via REST API.
 * Supports both standard and streaming responses.
 */

import type { Credentials } from "./types.js";

// =============================================================================
// Types
// =============================================================================

export interface CloudflareRestResponse {
  result: {
    response: string;
    output?: Array<{ type: string; role: string; content?: Array<{ text?: string }> }>;
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

// =============================================================================
// Cloudflare REST API
// =============================================================================

function validateCloudflareCredentials(credentials: Credentials) {
  const { cloudflareApiKey, cloudflareEmail, cloudflareAccountId } = credentials;
  if (!cloudflareApiKey || !cloudflareEmail || !cloudflareAccountId) {
    throw new Error("Cloudflare REST API requires cloudflareApiKey, cloudflareEmail, and cloudflareAccountId");
  }
  return { cloudflareApiKey, cloudflareEmail, cloudflareAccountId };
}

function buildRequestBody(model: string, messages: Array<{ role: string; content: string }>, stream = false): Record<string, unknown> {
  if (model.includes("gpt-oss")) {
    const userMessage = messages.find(m => m.role === "user")?.content || "";
    const systemMessage = messages.find(m => m.role === "system")?.content || "";
    return {
      input: userMessage,
      ...(stream && { stream: true }),
      ...(systemMessage && { instructions: systemMessage })
    };
  }
  return {
    messages,
    ...(stream && { stream: true }),
    ...(stream && model.includes('qwen') && { max_tokens: 1024 })
  };
}

/**
 * Call Cloudflare Workers AI via REST API
 */
export async function callCloudflareRest(
  model: string,
  messages: Array<{ role: string; content: string }>,
  credentials: Credentials
): Promise<CloudflareRestResponse> {
  const { cloudflareApiKey, cloudflareEmail, cloudflareAccountId } = validateCloudflareCredentials(credentials);
  const requestBody = buildRequestBody(model, messages);

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
 * Parse SSE lines and extract response chunks
 */
function* parseSSELines(lines: string[]): Generator<string> {
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.startsWith("data: ")) continue;
    const data = trimmed.slice(6);
    if (data === "[DONE]") return;
    try {
      const parsed = JSON.parse(data);
      if (parsed.response !== undefined && parsed.response !== "") {
        yield parsed.response;
      }
    } catch { /* skip malformed JSON */ }
  }
}

/**
 * Call Cloudflare Workers AI via REST API with streaming
 */
export async function* callCloudflareRestStream(
  model: string,
  messages: Array<{ role: string; content: string }>,
  credentials: Credentials
): AsyncGenerator<string, void, unknown> {
  const { cloudflareApiKey, cloudflareEmail, cloudflareAccountId } = validateCloudflareCredentials(credentials);

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/ai/run/${model}`,
    {
      method: "POST",
      headers: {
        "X-Auth-Email": cloudflareEmail,
        "X-Auth-Key": cloudflareApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildRequestBody(model, messages, true)),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cloudflare API error: ${response.status} ${text}`);
  }

  if (!response.body) throw new Error("No response body for streaming");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    yield* parseSSELines(lines);
  }
}

/**
 * Extract response text from gpt-oss format
 */
export function extractGptOssResponse(result: CloudflareRestResponse): string {
  if (result.result?.output) {
    const assistantMessage = result.result.output.find(
      (o) => o.type === "message" && o.role === "assistant"
    );
    return assistantMessage?.content?.[0]?.text || "";
  }
  return result.result?.response || "";
}
