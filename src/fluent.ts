/**
 * Fluent Builder API for unillm
 *
 * Modern, type-safe, chainable interface for LLM operations
 * Inspired by Prisma, Playwright, and modern TypeScript patterns
 */

import type { z } from "zod";
import type { Stream } from "@aid-on/nagare";
import { stream as nagareStream } from "@aid-on/nagare";
import type { ModelSpec, Credentials, GenerateOptions, GenerateResult } from "./types.js";
import { generate, parseModelSpec } from "./factory.js";
import { generateObject as baseGenerateObject, extractJSON } from "./structured.js";
import { withRetry, type RetryConfig } from "./retry.js";
import { truncateMessages, compressMessage } from "./memory.js";
import { createProviderStream } from "./fluent-streaming.js";

// =============================================================================
// Core Builder Types
// =============================================================================

interface FluentState {
  model?: ModelSpec | string;
  credentials?: Credentials;
  messages?: Array<{ role: string; content: string }>;
  system?: string;
  temperature?: number;
  maxTokens?: number;
  retryConfig?: RetryConfig;
  schema?: z.ZodType;
}

// =============================================================================
// Fluent Builder Class
// =============================================================================

export class UnillmBuilder {
  private state: FluentState = {};

  constructor(initialState: Partial<FluentState> = {}) {
    this.state = { ...initialState };
  }

  model(spec: ModelSpec | string): UnillmBuilder {
    return new UnillmBuilder({ ...this.state, model: spec });
  }

  credentials(creds: Credentials): UnillmBuilder {
    return new UnillmBuilder({ ...this.state, credentials: creds });
  }

  /** Alias for credentials */
  creds(creds: Credentials): UnillmBuilder { return this.credentials(creds); }

  temperature(temp: number): UnillmBuilder {
    return new UnillmBuilder({ ...this.state, temperature: temp });
  }

  /** Alias for temperature */
  temp(temp: number): UnillmBuilder { return this.temperature(temp); }

  maxTokens(tokens: number): UnillmBuilder {
    return new UnillmBuilder({ ...this.state, maxTokens: tokens });
  }

  /** Alias for maxTokens */
  tokens(tokens: number): UnillmBuilder { return this.maxTokens(tokens); }

  system(prompt: string): UnillmBuilder {
    return new UnillmBuilder({ ...this.state, system: prompt });
  }

  messages(msgs: Array<{ role: string; content: string }>): UnillmBuilder {
    return new UnillmBuilder({ ...this.state, messages: msgs });
  }

  user(content: string): UnillmBuilder {
    const messages = [...(this.state.messages || []), { role: "user", content }];
    return new UnillmBuilder({ ...this.state, messages });
  }

  assistant(content: string): UnillmBuilder {
    const messages = [...(this.state.messages || []), { role: "assistant", content }];
    return new UnillmBuilder({ ...this.state, messages });
  }

  schema<T extends z.ZodType>(schema: T): UnillmStructuredBuilder<T> {
    return new UnillmStructuredBuilder({ ...this.state, schema });
  }

  retry(config: RetryConfig): UnillmBuilder {
    return new UnillmBuilder({ ...this.state, retryConfig: config });
  }

  retries(count: number, baseDelay = 1000): UnillmBuilder {
    return this.retry({ maxRetries: count, baseDelay });
  }

  optimize(maxTokens = 4000): UnillmBuilder {
    const messages = this.state.messages;
    if (!messages) return this;
    const optimized = truncateMessages(messages, maxTokens);
    return new UnillmBuilder({ ...this.state, messages: optimized });
  }

  compress(): UnillmBuilder {
    const messages = this.state.messages?.map(m => ({
      ...m, content: compressMessage(m.content),
    }));
    return new UnillmBuilder({ ...this.state, messages });
  }

  // ===========================================================================
  // Generation Methods
  // ===========================================================================

  async generate(prompt?: string): Promise<GenerateResult> {
    this.validateRequired(prompt);
    const messages = this.prepareMessages(prompt);
    const options: GenerateOptions = {
      temperature: this.state.temperature,
      maxTokens: this.state.maxTokens,
    };
    const generateFn = () => generate(this.state.model!, messages, this.state.credentials!, options);
    return this.state.retryConfig ? withRetry(generateFn, this.state.retryConfig) : generateFn();
  }

  async stream(prompt?: string): Promise<Stream<string>> {
    this.validateRequired(prompt);
    const messages = this.prepareMessages(prompt);
    const { provider, model } = parseModelSpec(this.state.model!);
    const readableStream = await createProviderStream({
      provider, model, messages, credentials: this.state.credentials!,
      options: { temperature: this.state.temperature, maxTokens: this.state.maxTokens },
    });
    return nagareStream.from(readableStream);
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  private prepareMessages(prompt?: string): Array<{ role: string; content: string }> {
    let messages = this.state.messages || [];
    if (this.state.system) {
      messages = [{ role: "system", content: this.state.system }, ...messages];
    }
    if (prompt) {
      messages = [...messages, { role: "user", content: prompt }];
    }
    return messages;
  }

  private validateRequired(prompt?: string): void {
    if (!this.state.model) throw new Error("Model is required. Use .model('provider:model-name')");
    if (!this.state.credentials) throw new Error("Credentials are required. Use .credentials({ ... })");
    if (!prompt && (!this.state.messages || this.state.messages.length === 0)) {
      throw new Error("At least one message is required. Use .user('...') or .messages([...]), or provide a prompt to generate()");
    }
  }
}

// =============================================================================
// Structured Output Builder
// =============================================================================

export class UnillmStructuredBuilder<T extends z.ZodType> {
  private state: FluentState & { schema: T };

  constructor(state: FluentState & { schema: T }) {
    this.state = state;
  }

  async generate(prompt: string): Promise<{ object: z.infer<T>; rawText: string; usage?: Record<string, unknown> }> {
    if (!this.state.model || !this.state.credentials || !this.state.schema) {
      throw new Error("Model, credentials, and schema are required for structured generation");
    }
    return baseGenerateObject({
      model: this.state.model,
      credentials: this.state.credentials,
      schema: this.state.schema,
      prompt,
      system: this.state.system,
      temperature: this.state.temperature,
      maxTokens: this.state.maxTokens,
    });
  }

  extract(text: string): z.infer<T> {
    if (!this.state.schema) throw new Error("Schema is required for extraction");
    return extractJSON(text, this.state.schema);
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

export function unillm(initialState?: Partial<FluentState>): UnillmBuilder {
  return new UnillmBuilder(initialState);
}

export function quick(model: ModelSpec | string, credentials: Credentials): UnillmBuilder {
  return new UnillmBuilder({ model, credentials });
}
