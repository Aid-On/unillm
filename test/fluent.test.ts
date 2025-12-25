import { describe, it, expect, vi, beforeEach } from "vitest";
import { unilmp, quick, groq, gemini, cloudflare, UnilmpBuilder } from "../src/fluent.js";
import { z } from "zod";

// Mock the generate function
vi.mock("../src/factory.js", () => ({
  generate: vi.fn(),
  generateWithGroq: vi.fn(),
  generateWithGemini: vi.fn(),
}));

vi.mock("../src/structured.js", () => ({
  generateObject: vi.fn(),
  extractJSON: vi.fn(),
}));

import { generate } from "../src/factory.js";
import { generateObject, extractJSON } from "../src/structured.js";

const mockGenerate = vi.mocked(generate);
const mockGenerateObject = vi.mocked(generateObject);
const mockExtractJSON = vi.mocked(extractJSON);

describe("Fluent Builder API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("unilmp builder", () => {
    it("should build and execute basic generation", async () => {
      mockGenerate.mockResolvedValue({
        text: "Hello world",
        usage: { promptTokens: 10, completionTokens: 5 },
      });

      const result = await unilmp()
        .model("groq:llama-3.1-8b-instant")
        .credentials({ groqApiKey: "test-key" })
        .temperature(0.7)
        .maxTokens(100)
        .generate("Say hello");

      expect(result.text).toBe("Hello world");
      expect(mockGenerate).toHaveBeenCalledWith(
        "groq:llama-3.1-8b-instant",
        [{ role: "user", content: "Say hello" }],
        { groqApiKey: "test-key" },
        { temperature: 0.7, maxTokens: 100 }
      );
    });

    it("should support method aliases", async () => {
      mockGenerate.mockResolvedValue({ text: "test" });

      await unilmp()
        .model("groq:llama-3.1-8b-instant")
        .creds({ groqApiKey: "test-key" })
        .temp(0.5)
        .tokens(50)
        .generate("test");

      expect(mockGenerate).toHaveBeenCalledWith(
        "groq:llama-3.1-8b-instant",
        [{ role: "user", content: "test" }],
        { groqApiKey: "test-key" },
        { temperature: 0.5, maxTokens: 50 }
      );
    });

    it("should handle conversation building", async () => {
      mockGenerate.mockResolvedValue({ text: "response" });

      await unilmp()
        .model("groq:llama-3.1-8b-instant")
        .credentials({ groqApiKey: "test-key" })
        .system("You are helpful")
        .user("Hello")
        .assistant("Hi there!")
        .user("How are you?")
        .generate();

      expect(mockGenerate).toHaveBeenCalledWith(
        "groq:llama-3.1-8b-instant",
        [
          { role: "system", content: "You are helpful" },
          { role: "user", content: "Hello" },
          { role: "assistant", content: "Hi there!" },
          { role: "user", content: "How are you?" },
        ],
        { groqApiKey: "test-key" },
        { temperature: undefined, maxTokens: undefined }
      );
    });

    it("should throw error when model is missing", async () => {
      await expect(
        unilmp()
          .credentials({ groqApiKey: "test-key" })
          .generate("test")
      ).rejects.toThrow("Model is required");
    });

    it("should throw error when credentials are missing", async () => {
      await expect(
        unilmp()
          .model("groq:llama-3.1-8b-instant")
          .generate("test")
      ).rejects.toThrow("Credentials are required");
    });
  });

  describe("structured generation", () => {
    it("should generate structured output with schema", async () => {
      const mockResult = {
        object: { name: "John", age: 30 },
        rawText: '{"name": "John", "age": 30}',
        usage: { promptTokens: 10, completionTokens: 20 },
      };
      mockGenerateObject.mockResolvedValue(mockResult);

      const schema = z.object({ name: z.string(), age: z.number() });
      
      const result = await unilmp()
        .model("groq:llama-3.3-70b-versatile")
        .credentials({ groqApiKey: "test-key" })
        .schema(schema)
        .generate("Create a person");

      expect(result.object).toEqual({ name: "John", age: 30 });
      expect(mockGenerateObject).toHaveBeenCalledWith({
        model: "groq:llama-3.3-70b-versatile",
        credentials: { groqApiKey: "test-key" },
        schema,
        prompt: "Create a person",
        system: undefined,
        temperature: undefined,
        maxTokens: undefined,
      });
    });

    it("should extract data from existing text", () => {
      const schema = z.object({ value: z.number() });
      mockExtractJSON.mockReturnValue({ value: 42 });

      const result = unilmp()
        .schema(schema)
        .extract("The answer is {\"value\": 42}");

      expect(result).toEqual({ value: 42 });
      expect(mockExtractJSON).toHaveBeenCalledWith("The answer is {\"value\": 42}", schema);
    });
  });

  describe("quick function", () => {
    it("should create builder with model and credentials", async () => {
      mockGenerate.mockResolvedValue({ text: "quick response" });

      const result = await quick("groq:llama-3.1-8b-instant", { groqApiKey: "test-key" })
        .generate("Hello");

      expect(result.text).toBe("quick response");
      expect(mockGenerate).toHaveBeenCalledWith(
        "groq:llama-3.1-8b-instant",
        [{ role: "user", content: "Hello" }],
        { groqApiKey: "test-key" },
        { temperature: undefined, maxTokens: undefined }
      );
    });
  });

  describe("provider shortcuts", () => {
    it("should work with groq shortcuts", async () => {
      mockGenerate.mockResolvedValue({ text: "groq response" });

      const result = await groq.instant("test-key").generate("Hello");
      
      expect(result.text).toBe("groq response");
      expect(mockGenerate).toHaveBeenCalledWith(
        "groq:llama-3.1-8b-instant",
        [{ role: "user", content: "Hello" }],
        { groqApiKey: "test-key" },
        { temperature: undefined, maxTokens: undefined }
      );
    });

    it("should work with gemini shortcuts", async () => {
      mockGenerate.mockResolvedValue({ text: "gemini response" });

      const result = await gemini.flash("test-key").generate("Hello");
      
      expect(result.text).toBe("gemini response");
      expect(mockGenerate).toHaveBeenCalledWith(
        "gemini:gemini-2.0-flash",
        [{ role: "user", content: "Hello" }],
        { geminiApiKey: "test-key" },
        { temperature: undefined, maxTokens: undefined }
      );
    });

    it("should work with cloudflare shortcuts", async () => {
      mockGenerate.mockResolvedValue({ text: "cloudflare response" });

      const creds = { apiKey: "key", email: "test@example.com", accountId: "account" };
      const result = await cloudflare.gpt120b(creds).generate("Hello");
      
      expect(result.text).toBe("cloudflare response");
      expect(mockGenerate).toHaveBeenCalledWith(
        "cloudflare:@cf/openai/gpt-oss-120b",
        [{ role: "user", content: "Hello" }],
        {
          cloudflareApiKey: "key",
          cloudflareEmail: "test@example.com", 
          cloudflareAccountId: "account",
        },
        { temperature: undefined, maxTokens: undefined }
      );
    });
  });

  describe("memory optimization", () => {
    it("should optimize messages for token limit", async () => {
      mockGenerate.mockResolvedValue({ text: "optimized" });

      const longMessages = Array.from({ length: 100 }, (_, i) => ({
        role: i % 2 === 0 ? "user" : "assistant",
        content: `Message ${i} with some content`,
      }));

      await unilmp()
        .model("groq:llama-3.1-8b-instant")
        .credentials({ groqApiKey: "test-key" })
        .messages(longMessages)
        .optimize(1000) // Limit to 1000 tokens
        .generate();

      // Should call with optimized messages (may be same if within limit)
      const [, messages] = mockGenerate.mock.calls[0];
      expect(messages.length).toBeLessThanOrEqual(longMessages.length);
    });

    it("should compress message content", async () => {
      mockGenerate.mockResolvedValue({ text: "compressed" });

      await unilmp()
        .model("groq:llama-3.1-8b-instant")
        .credentials({ groqApiKey: "test-key" })
        .user("Hello    world\n\n\nHow are you?   ")
        .compress()
        .generate();

      const [, messages] = mockGenerate.mock.calls[0];
      expect(messages[0].content).toBe("Hello world\nHow are you?");
    });
  });

  describe("retry configuration", () => {
    it("should handle retry configuration", async () => {
      mockGenerate.mockResolvedValue({ text: "retry test" });

      await unilmp()
        .model("groq:llama-3.1-8b-instant")
        .credentials({ groqApiKey: "test-key" })
        .retries(3, 500)
        .generate("test");

      // Should have been called via withRetry (implementation detail)
      expect(mockGenerate).toHaveBeenCalled();
    });
  });
});