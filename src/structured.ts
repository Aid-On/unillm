/**
 * Structured Output Functions (Edge-Native)
 *
 * Pure implementation without AI SDK dependencies
 * Uses JSON extraction from text responses with Zod validation
 */

import type { z } from "zod";
import { LLMProviderError } from "./errors.js";
import { generate } from "./factory.js";
import type { ModelSpec, Credentials } from "./types.js";

// =============================================================================
// Types
// =============================================================================

export interface GenerateObjectOptions<T extends z.ZodType> {
  /** Model specification (e.g., "groq:llama-3.1-8b-instant") */
  model: ModelSpec | string;
  /** API credentials */
  credentials: Credentials;
  /** Zod schema for the expected output */
  schema: T;
  /** User prompt */
  prompt: string;
  /** Optional system prompt */
  system?: string;
  /** Temperature (0-1) */
  temperature?: number;
  /** Max tokens */
  maxTokens?: number;
}

export interface GenerateObjectResult<T> {
  /** Parsed and validated object */
  object: T;
  /** Raw text response */
  rawText: string;
  /** Token usage */
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Generate a structured object using edge-native implementation
 *
 * @example
 * ```typescript
 * const result = await generateObject({
 *   model: "groq:llama-3.1-8b-instant",
 *   credentials: { groqApiKey: process.env.GROQ_API_KEY },
 *   schema: z.object({ name: z.string(), age: z.number() }),
 *   prompt: "Generate a person",
 * });
 * ```
 */
export async function generateObject<T extends z.ZodType>(
  options: GenerateObjectOptions<T>
): Promise<GenerateObjectResult<z.infer<T>>> {
  const { model, credentials, schema, prompt, system, temperature, maxTokens } = options;

  // Create JSON prompt
  const jsonPrompt = `${prompt}

Respond with valid JSON only, no other text. The JSON must match this schema:
${JSON.stringify(schema._def, null, 2)}

Example format: {"field1": "value1", "field2": 123}`;

  const messages = [
    ...(system ? [{ role: "system", content: system }] : []),
    { role: "user", content: jsonPrompt },
  ];

  const result = await generate(model, messages, credentials, {
    temperature,
    maxTokens,
  });

  const object = extractJSON(result.text, schema);

  return {
    object,
    rawText: result.text,
    usage: result.usage,
  };
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Extract JSON from text response (edge-native)
 *
 * @example
 * ```typescript
 * const response = "Here's the data: {\"name\": \"test\", \"value\": 42}";
 * const schema = z.object({ name: z.string(), value: z.number() });
 * const result = extractJSON(response, schema);
 * // => { name: "test", value: 42 }
 * ```
 */
export function extractJSON<T extends z.ZodType>(
  text: string,
  schema?: T
): T extends z.ZodType ? z.infer<T> : any {
  // Try to find JSON in the text
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new LLMProviderError({
      message: "No JSON object found in response",
      code: "INVALID_RESPONSE",
    });
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);

    if (schema) {
      const result = schema.safeParse(parsed);

      if (!result.success) {
        throw new LLMProviderError({
          message: `Schema validation failed: ${result.error.message}`,
          code: "VALIDATION",
        });
      }

      return result.data;
    }

    return parsed;
  } catch (error) {
    if (error instanceof LLMProviderError) throw error;

    throw new LLMProviderError({
      message: `Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`,
      code: "INVALID_RESPONSE",
      cause: error instanceof Error ? error : undefined,
    });
  }
}