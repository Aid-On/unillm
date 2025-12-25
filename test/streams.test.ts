import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createCloudflareStream,
  cloudflareStreamToText,
  streamToResponse,
  streamToAsyncIterator,
} from "../src/streams.js";
import type { Credentials } from "../src/types.js";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("WebStreams utilities", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  const credentials: Credentials = {
    cloudflareApiKey: "test-key",
    cloudflareEmail: "test@example.com",
    cloudflareAccountId: "test-account-id",
  };

  describe("createCloudflareStream", () => {
    it("should create ReadableStream from Cloudflare API", async () => {
      const mockChunks = [
        'data: {"response": "Hello"}\n\n',
        'data: {"response": " world"}\n\n',
        'data: [DONE]\n\n',
      ];

      const mockBody = new ReadableStream({
        start(controller) {
          mockChunks.forEach(chunk => {
            controller.enqueue(new TextEncoder().encode(chunk));
          });
          controller.close();
        },
      });

      mockFetch.mockResolvedValue({
        ok: true,
        body: mockBody,
      });

      const stream = createCloudflareStream(
        "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
        [{ role: "user", content: "Hello" }],
        credentials
      );

      const chunks = [];
      const reader = stream.getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      expect(chunks).toHaveLength(3);
      expect(chunks[0]).toEqual({ response: "Hello" });
      expect(chunks[1]).toEqual({ response: " world" });
      expect(chunks[2]).toEqual({ response: "", finished: true });
    });

    it("should throw error when credentials are missing", () => {
      expect(() => {
        createCloudflareStream(
          "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
          [{ role: "user", content: "Hello" }],
          {}
        );
      }).toThrow("Cloudflare REST API requires cloudflareApiKey");
    });

    it("should handle API errors", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve("Unauthorized"),
      });

      const stream = createCloudflareStream(
        "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
        [{ role: "user", content: "Hello" }],
        credentials
      );

      const reader = stream.getReader();
      
      await expect(reader.read()).rejects.toThrow("Cloudflare API error: 401 Unauthorized");
    });
  });

  describe("cloudflareStreamToText", () => {
    it("should convert CloudflareStreamChunk to text stream", async () => {
      const sourceStream = new ReadableStream({
        start(controller) {
          controller.enqueue({ response: "Hello" });
          controller.enqueue({ response: " world" });
          controller.enqueue({ response: "", finished: true });
          controller.close();
        },
      });

      const textStream = cloudflareStreamToText(sourceStream);
      const chunks = [];
      const reader = textStream.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      expect(chunks).toEqual(["Hello", " world"]);
    });

    it("should handle empty responses", async () => {
      const sourceStream = new ReadableStream({
        start(controller) {
          controller.enqueue({ response: "" });
          controller.enqueue({ response: "", finished: true });
          controller.close();
        },
      });

      const textStream = cloudflareStreamToText(sourceStream);
      const chunks = [];
      const reader = textStream.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      expect(chunks).toEqual([]);
    });
  });

  describe("streamToResponse", () => {
    it("should create Response from text stream", async () => {
      const textStream = new ReadableStream({
        start(controller) {
          controller.enqueue("Hello");
          controller.enqueue(" world");
          controller.close();
        },
      });

      const response = streamToResponse(textStream);

      expect(response).toBeInstanceOf(Response);
      expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
      expect(response.headers.get("Cache-Control")).toBe("no-cache");

      const text = await response.text();
      expect(text).toBe("Hello world");
    });

    it("should merge custom headers", () => {
      const textStream = new ReadableStream({
        start(controller) {
          controller.close();
        },
      });

      const response = streamToResponse(textStream, {
        headers: {
          "Custom-Header": "value",
          "Content-Type": "application/json",
        },
      });

      expect(response.headers.get("Custom-Header")).toBe("value");
      expect(response.headers.get("Content-Type")).toBe("application/json");
      expect(response.headers.get("Cache-Control")).toBe("no-cache");
    });
  });

  describe("streamToAsyncIterator", () => {
    it("should convert ReadableStream to AsyncIterator", async () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue("chunk1");
          controller.enqueue("chunk2");
          controller.enqueue("chunk3");
          controller.close();
        },
      });

      const chunks = [];
      for await (const chunk of streamToAsyncIterator(stream)) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(["chunk1", "chunk2", "chunk3"]);
    });

    it("should handle empty streams", async () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.close();
        },
      });

      const chunks = [];
      for await (const chunk of streamToAsyncIterator(stream)) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual([]);
    });

    it("should handle stream errors", async () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue("chunk1");
          // Delay the error to ensure chunk1 is read first
          setTimeout(() => controller.error(new Error("Stream error")), 0);
        },
      });

      const chunks = [];
      
      try {
        for await (const chunk of streamToAsyncIterator(stream)) {
          chunks.push(chunk);
        }
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("Stream error");
      }

      expect(chunks.length).toBeGreaterThan(0);
    });
  });
});