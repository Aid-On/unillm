import { describe, it, expect, vi } from "vitest";
import { generateObject, extractJSON } from "../src/structured.js";
import { z } from "zod";

// Mock the generate function
vi.mock("../src/factory.js", () => ({
  generate: vi.fn(),
}));

import { generate } from "../src/factory.js";
const mockGenerate = vi.mocked(generate);

describe("generateObject (edge-native)", () => {
  it("should generate object with schema validation", async () => {
    mockGenerate.mockResolvedValue({
      text: '{"name": "John", "age": 30}',
      usage: { promptTokens: 10, completionTokens: 20 },
    });

    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const result = await generateObject({
      model: "groq:llama-3.1-8b-instant",
      credentials: { groqApiKey: "test-key" },
      schema,
      prompt: "Generate a person",
    });

    expect(result.object).toEqual({ name: "John", age: 30 });
    expect(result.rawText).toBe('{"name": "John", "age": 30}');
    expect(result.usage).toEqual({ promptTokens: 10, completionTokens: 20 });

    expect(mockGenerate).toHaveBeenCalledWith(
      "groq:llama-3.1-8b-instant",
      [
        {
          role: "user",
          content: expect.stringContaining("Generate a person")
        }
      ],
      { groqApiKey: "test-key" },
      {}
    );
  });

  it("should include system prompt when provided", async () => {
    mockGenerate.mockResolvedValue({
      text: '{"result": "success"}',
    });

    const schema = z.object({ result: z.string() });

    await generateObject({
      model: "groq:llama-3.1-8b-instant",
      credentials: { groqApiKey: "test-key" },
      schema,
      prompt: "Do something",
      system: "You are helpful",
    });

    expect(mockGenerate).toHaveBeenCalledWith(
      "groq:llama-3.1-8b-instant",
      [
        { role: "system", content: "You are helpful" },
        { role: "user", content: expect.any(String) }
      ],
      { groqApiKey: "test-key" },
      {}
    );
  });

  it("should pass temperature and maxTokens", async () => {
    mockGenerate.mockResolvedValue({
      text: '{"value": 42}',
    });

    const schema = z.object({ value: z.number() });

    await generateObject({
      model: "groq:llama-3.1-8b-instant",
      credentials: { groqApiKey: "test-key" },
      schema,
      prompt: "Generate number",
      temperature: 0.5,
      maxTokens: 100,
    });

    expect(mockGenerate).toHaveBeenCalledWith(
      "groq:llama-3.1-8b-instant",
      expect.any(Array),
      { groqApiKey: "test-key" },
      { temperature: 0.5, maxTokens: 100 }
    );
  });

  it("should throw on invalid JSON", async () => {
    mockGenerate.mockResolvedValue({
      text: "This is not JSON",
    });

    const schema = z.object({ name: z.string() });

    await expect(
      generateObject({
        model: "groq:llama-3.1-8b-instant",
        credentials: { groqApiKey: "test-key" },
        schema,
        prompt: "Generate something",
      })
    ).rejects.toThrow("No JSON object found in response");
  });

  it("should throw on schema validation failure", async () => {
    mockGenerate.mockResolvedValue({
      text: '{"name": 123}', // name should be string
    });

    const schema = z.object({ name: z.string() });

    await expect(
      generateObject({
        model: "groq:llama-3.1-8b-instant",
        credentials: { groqApiKey: "test-key" },
        schema,
        prompt: "Generate something",
      })
    ).rejects.toThrow("Schema validation failed");
  });
});

describe("extractJSON", () => {
  it("should extract valid JSON from text", () => {
    const text = 'Here is the data: {"name": "test", "value": 42} and more text';
    const schema = z.object({ name: z.string(), value: z.number() });
    
    const result = extractJSON(text, schema);
    expect(result).toEqual({ name: "test", value: 42 });
  });

  it("should work without schema", () => {
    const text = 'Data: {"anything": "goes"}';
    const result = extractJSON(text);
    expect(result).toEqual({ anything: "goes" });
  });

  it("should throw on no JSON found", () => {
    const text = "No JSON here";
    expect(() => extractJSON(text)).toThrow("No JSON object found in response");
  });

  it("should throw on invalid JSON", () => {
    const text = "Invalid: {name: test}"; // Missing quotes
    expect(() => extractJSON(text)).toThrow("Failed to parse JSON");
  });

  it("should throw on schema validation failure", () => {
    const text = '{"name": 123}'; // Should be string
    const schema = z.object({ name: z.string() });
    
    expect(() => extractJSON(text, schema)).toThrow("Schema validation failed");
  });

  it("should handle complex nested JSON", () => {
    const text = `Response: {
      "user": {"name": "John", "age": 30},
      "items": ["a", "b", "c"],
      "active": true
    }`;
    
    const schema = z.object({
      user: z.object({ name: z.string(), age: z.number() }),
      items: z.array(z.string()),
      active: z.boolean(),
    });
    
    const result = extractJSON(text, schema);
    expect(result).toEqual({
      user: { name: "John", age: 30 },
      items: ["a", "b", "c"],
      active: true,
    });
  });
});