/**
 * Edge-native streaming utilities using Web Streams API
 * 
 * Provides WebStreams-compatible streaming for edge computing environments
 * like Cloudflare Workers, Vercel Edge Functions, etc.
 */

import type { Credentials } from "./types.js";

// =============================================================================
// WebStreams-compatible Cloudflare API
// =============================================================================

export interface CloudflareStreamChunk {
  response: string;
  finished?: boolean;
}

/**
 * Stream Cloudflare Workers AI responses using ReadableStream (WebStreams API)
 * This is more suitable for edge environments than AsyncGenerator.
 * 
 * @example
 * ```typescript
 * const stream = createCloudflareStream(model, messages, credentials);
 * 
 * const reader = stream.getReader();
 * while (true) {
 *   const { done, value } = await reader.read();
 *   if (done) break;
 *   console.log(value); // CloudflareStreamChunk
 * }
 * ```
 */
/**
 * Process SSE lines and emit CloudflareStreamChunk events
 * Returns true if [DONE] was encountered
 */
function processSSELines(lines: string[], controller: ReadableStreamDefaultController<CloudflareStreamChunk>): boolean {
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.startsWith("data: ")) continue;

    const data = trimmed.slice(6);
    if (data === "[DONE]") {
      controller.enqueue({ response: "", finished: true });
      return true;
    }

    try {
      const parsed = JSON.parse(data);
      if (parsed.response) {
        controller.enqueue({ response: parsed.response });
      }
    } catch { /* skip malformed JSON */ }
  }
  return false;
}

async function readSSEStream(body: ReadableStream<Uint8Array>, controller: ReadableStreamDefaultController<CloudflareStreamChunk>): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    if (processSSELines(lines, controller)) {
      controller.close();
      return;
    }
  }
  controller.close();
}

export function createCloudflareStream(
  model: string,
  messages: Array<{ role: string; content: string }>,
  credentials: Credentials
): ReadableStream<CloudflareStreamChunk> {
  const { cloudflareApiKey, cloudflareEmail, cloudflareAccountId } = credentials;

  if (!cloudflareApiKey || !cloudflareEmail || !cloudflareAccountId) {
    throw new Error("Cloudflare REST API requires cloudflareApiKey, cloudflareEmail, and cloudflareAccountId");
  }

  return new ReadableStream({
    async start(controller) {
      try {
        const response = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/ai/run/${model}`,
          {
            method: "POST",
            headers: { "X-Auth-Email": cloudflareEmail, "X-Auth-Key": cloudflareApiKey, "Content-Type": "application/json" },
            body: JSON.stringify({ messages, stream: true }),
          }
        );

        if (!response.ok) throw new Error(`Cloudflare API error: ${response.status} ${await response.text()}`);
        if (!response.body) throw new Error("No response body for streaming");

        await readSSEStream(response.body, controller);
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

/**
 * Convert a CloudflareStreamChunk stream to text chunks
 * Useful for integrating with other streaming APIs
 * 
 * @example
 * ```typescript
 * const cloudflareStream = createCloudflareStream(model, messages, credentials);
 * const textStream = cloudflareStreamToText(cloudflareStream);
 * 
 * const reader = textStream.getReader();
 * while (true) {
 *   const { done, value } = await reader.read();
 *   if (done) break;
 *   process.stdout.write(value); // string
 * }
 * ```
 */
export function cloudflareStreamToText(
  stream: ReadableStream<CloudflareStreamChunk>
): ReadableStream<string> {
  return new ReadableStream({
    start(controller) {
      const reader = stream.getReader();

      async function pump(): Promise<void> {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.close();
              break;
            }

            if (value.finished) {
              controller.close();
              break;
            }

            if (value.response) {
              controller.enqueue(value.response);
            }
          }
        } catch (error) {
          controller.error(error);
        }
      }

      pump();
    },
  });
}

// =============================================================================
// Response utilities
// =============================================================================

/**
 * Convert a ReadableStream to Response object
 * Useful for returning streaming responses in edge functions
 * 
 * @example
 * ```typescript
 * export async function POST(request: Request) {
 *   const stream = createCloudflareStream(model, messages, credentials);
 *   const textStream = cloudflareStreamToText(stream);
 *   
 *   return streamToResponse(textStream, {
 *     headers: { "Content-Type": "text/plain; charset=utf-8" }
 *   });
 * }
 * ```
 */
export function streamToResponse(
  stream: ReadableStream<string>,
  init?: ResponseInit
): Response {
  // Convert string stream to Uint8Array stream for Response
  const encoder = new TextEncoder();
  const uint8Stream = new ReadableStream({
    start(controller) {
      const reader = stream.getReader();

      async function pump(): Promise<void> {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.close();
              break;
            }
            controller.enqueue(encoder.encode(value));
          }
        } catch (error) {
          controller.error(error);
        }
      }

      pump();
    },
  });

  return new Response(uint8Stream, {
    ...init,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      ...init?.headers,
    },
  });
}

/**
 * Convert ReadableStream to AsyncIterator for easier consumption
 * 
 * @example
 * ```typescript
 * const stream = createCloudflareStream(model, messages, credentials);
 * 
 * for await (const chunk of streamToAsyncIterator(stream)) {
 *   console.log(chunk.response);
 * }
 * ```
 */
export async function* streamToAsyncIterator<T>(
  stream: ReadableStream<T>
): AsyncIterableIterator<T> {
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      yield value;
    }
  } finally {
    reader.releaseLock();
  }
}