/**
 * Fluent Builder API for unilmp
 *
 * Modern, type-safe, chainable interface for LLM operations
 * Inspired by Prisma, Playwright, and modern TypeScript patterns
 */

import type { z } from "zod";
// Proper nagare integration
import type { Stream } from "@aid-on/nagare";
import { stream as nagareStream } from "@aid-on/nagare";
import type { ModelSpec, Credentials, GenerateOptions, GenerateResult } from "./types.js";
import { generate, generateWithGroq, generateWithGemini, callCloudflareRestStream, parseModelSpec } from "./factory.js";
import { generateObject as baseGenerateObject, extractJSON } from "./structured.js";
import { withRetry, type RetryConfig } from "./retry.js";
import { truncateMessages, compressMessage } from "./memory.js";
import { getStreamHandler, hasStreamHandler } from "./streaming-handlers.js";

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

export class UnilmpBuilder {
  private state: FluentState = {};

  constructor(initialState: Partial<FluentState> = {}) {
    this.state = { ...initialState };
  }

  /**
   * Set the model to use
   * 
   * @example
   * ```typescript
   * unilmp.model("groq:llama-3.1-8b-instant")
   * unilmp.model("gemini:gemini-2.0-flash")
   * unilmp.model("cloudflare:@cf/openai/gpt-oss-120b")
   * ```
   */
  model(spec: ModelSpec | string): UnilmpBuilder {
    return new UnilmpBuilder({ ...this.state, model: spec });
  }

  /**
   * Set credentials
   * 
   * @example
   * ```typescript
   * unilmp.credentials({ groqApiKey: "..." })
   * unilmp.creds({ groqApiKey: "..." }) // alias
   * ```
   */
  credentials(creds: Credentials): UnilmpBuilder {
    return new UnilmpBuilder({ ...this.state, credentials: creds });
  }

  /** Alias for credentials */
  creds(creds: Credentials): UnilmpBuilder {
    return this.credentials(creds);
  }

  /**
   * Set temperature (0-1)
   */
  temperature(temp: number): UnilmpBuilder {
    return new UnilmpBuilder({ ...this.state, temperature: temp });
  }

  /** Alias for temperature */
  temp(temp: number): UnilmpBuilder {
    return this.temperature(temp);
  }

  /**
   * Set max tokens
   */
  maxTokens(tokens: number): UnilmpBuilder {
    return new UnilmpBuilder({ ...this.state, maxTokens: tokens });
  }

  /** Alias for maxTokens */
  tokens(tokens: number): UnilmpBuilder {
    return this.maxTokens(tokens);
  }

  /**
   * Set system prompt
   */
  system(prompt: string): UnilmpBuilder {
    return new UnilmpBuilder({ ...this.state, system: prompt });
  }

  /**
   * Set messages for conversation
   */
  messages(msgs: Array<{ role: string; content: string }>): UnilmpBuilder {
    return new UnilmpBuilder({ ...this.state, messages: msgs });
  }

  /**
   * Add a user message
   */
  user(content: string): UnilmpBuilder {
    const messages = [...(this.state.messages || []), { role: "user", content }];
    return new UnilmpBuilder({ ...this.state, messages });
  }

  /**
   * Add an assistant message
   */
  assistant(content: string): UnilmpBuilder {
    const messages = [...(this.state.messages || []), { role: "assistant", content }];
    return new UnilmpBuilder({ ...this.state, messages });
  }

  /**
   * Set Zod schema for structured output
   */
  schema<T extends z.ZodType>(schema: T): UnilmpStructuredBuilder<T> {
    return new UnilmpStructuredBuilder({ ...this.state, schema });
  }

  /**
   * Set retry configuration
   */
  retry(config: RetryConfig): UnilmpBuilder {
    return new UnilmpBuilder({ ...this.state, retryConfig: config });
  }

  /**
   * Quick retry setup
   */
  retries(count: number, baseDelay = 1000): UnilmpBuilder {
    return this.retry({ maxRetries: count, baseDelay });
  }

  /**
   * Optimize messages for memory constraints
   */
  optimize(maxTokens = 4000): UnilmpBuilder {
    const messages = this.state.messages;
    if (!messages) return this;

    const optimized = truncateMessages(messages, maxTokens);
    return new UnilmpBuilder({ ...this.state, messages: optimized });
  }

  /**
   * Compress message content
   */
  compress(): UnilmpBuilder {
    const messages = this.state.messages?.map(m => ({
      ...m,
      content: compressMessage(m.content),
    }));
    return new UnilmpBuilder({ ...this.state, messages });
  }

  // =============================================================================
  // Generation Methods
  // =============================================================================

  /**
   * Generate text
   */
  async generate(prompt?: string): Promise<GenerateResult> {
    this.validateRequired(prompt);

    let messages = this.state.messages || [];
    
    // Add system message if specified
    if (this.state.system) {
      messages = [{ role: "system", content: this.state.system }, ...messages];
    }
    
    // Add user prompt if provided
    if (prompt) {
      messages = [...messages, { role: "user", content: prompt }];
    }

    const options: GenerateOptions = {
      temperature: this.state.temperature,
      maxTokens: this.state.maxTokens,
    };

    const generateFn = () => generate(
      this.state.model!,
      messages,
      this.state.credentials!,
      options
    );

    if (this.state.retryConfig) {
      return withRetry(generateFn, this.state.retryConfig);
    }

    return generateFn();
  }

  /**
   * Stream generation (returns nagare Stream<string>)
   * 
   * @example
   * ```typescript
   * const stream = await unilmp()
   *   .model("groq:llama-3.1-8b-instant")
   *   .credentials({ groqApiKey: "..." })
   *   .stream("Hello world");
   * 
   * // nagare Stream<T> として使用可能
   * stream.subscribe(token => updateUI(token));
   * return stream.toResponse();
   * ```
   */
  async stream(prompt?: string): Promise<Stream<string>> {
    this.validateRequired(prompt);

    let messages = this.state.messages || [];
    
    // Add system message if specified
    if (this.state.system) {
      messages = [{ role: "system", content: this.state.system }, ...messages];
    }
    
    // Add user prompt if provided
    if (prompt) {
      messages = [...messages, { role: "user", content: prompt }];
    }

    const { provider, model } = parseModelSpec(this.state.model!);

    // Create streaming ReadableStream based on provider
    let readableStream: ReadableStream<string>;

    switch (provider) {
      case "groq": {
        if (!this.state.credentials?.groqApiKey) {
          throw new Error("groqApiKey is required for Groq streaming");
        }
        
        // Check if we have a dedicated handler for this model
        const handler = getStreamHandler(model);
        if (handler) {
          console.log(`[unilmp] Using dedicated handler for ${model}`);
          readableStream = await handler.createStream(
            messages,
            this.state.credentials.groqApiKey,
            {
              temperature: this.state.temperature,
              maxTokens: this.state.maxTokens,
            }
          );
        } else {
          console.log(`[unilmp] Using generic Groq handler for ${model}`);
          readableStream = await createGroqStream(
            model, 
            messages, 
            this.state.credentials.groqApiKey,
            {
              temperature: this.state.temperature,
              maxTokens: this.state.maxTokens,
            }
          );
        }
        break;
      }

      case "gemini": {
        if (!this.state.credentials?.geminiApiKey) {
          throw new Error("geminiApiKey is required for Gemini streaming");
        }
        
        // Check if we have a dedicated handler for this model
        const handler = getStreamHandler(model);
        if (handler) {
          console.log(`[unilmp] Using dedicated handler for ${model}`);
          readableStream = await handler.createStream(
            messages,
            this.state.credentials.geminiApiKey,
            {
              temperature: this.state.temperature,
              maxTokens: this.state.maxTokens,
            }
          );
        } else {
          console.log(`[unilmp] Using generic Gemini handler for ${model}`);
          readableStream = await createGeminiStream(
            model, 
            messages, 
            this.state.credentials.geminiApiKey,
            {
              temperature: this.state.temperature,
              maxTokens: this.state.maxTokens,
            }
          );
        }
        break;
      }

      case "cloudflare": {
        if (!this.state.credentials?.cloudflareApiKey || !this.state.credentials?.cloudflareEmail || !this.state.credentials?.cloudflareAccountId) {
          throw new Error("Cloudflare credentials required for streaming");
        }
        
        // Use existing callCloudflareRestStream and convert to ReadableStream
        const asyncIterator = callCloudflareRestStream(model, messages, this.state.credentials);
        readableStream = new ReadableStream<string>({
          async start(controller) {
            try {
              for await (const chunk of asyncIterator) {
                controller.enqueue(chunk);
              }
              controller.close();
            } catch (error) {
              controller.error(error);
            }
          }
        });
        break;
      }

      default:
        throw new Error(`Streaming not supported for provider: ${provider}`);
    }

    // Convert to nagare Stream<T>
    return nagareStream.from(readableStream);
  }

  // =============================================================================
  // Validation
  // =============================================================================

  private validateRequired(prompt?: string): void {
    if (!this.state.model) {
      throw new Error("Model is required. Use .model('provider:model-name')");
    }
    if (!this.state.credentials) {
      throw new Error("Credentials are required. Use .credentials({ ... })");
    }
    // Allow generation if prompt is provided OR messages exist
    if (!prompt && (!this.state.messages || this.state.messages.length === 0)) {
      throw new Error("At least one message is required. Use .user('...') or .messages([...]), or provide a prompt to generate()");
    }
  }
}

// =============================================================================
// Structured Output Builder
// =============================================================================

export class UnilmpStructuredBuilder<T extends z.ZodType> {
  private state: FluentState & { schema: T };

  constructor(state: FluentState & { schema: T }) {
    this.state = state;
  }

  /**
   * Generate structured object
   */
  async generate(prompt: string): Promise<{ object: z.infer<T>; rawText: string; usage?: any }> {
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

  /**
   * Extract structured data from existing text
   */
  extract(text: string): z.infer<T> {
    if (!this.state.schema) {
      throw new Error("Schema is required for extraction");
    }
    return extractJSON(text, this.state.schema);
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a new fluent builder instance
 * 
 * @example
 * ```typescript
 * const result = await unilmp()
 *   .model("groq:llama-3.1-8b-instant")
 *   .credentials({ groqApiKey: "..." })
 *   .temperature(0.7)
 *   .generate("Hello world");
 * ```
 */
export function unilmp(initialState?: Partial<FluentState>): UnilmpBuilder {
  return new UnilmpBuilder(initialState);
}

/**
 * Quick model setup with credentials
 * 
 * @example
 * ```typescript
 * const groq = quick("groq:llama-3.1-8b-instant", { groqApiKey: "..." });
 * const result = await groq.generate("Hello");
 * ```
 */
export function quick(model: ModelSpec | string, credentials: Credentials): UnilmpBuilder {
  return new UnilmpBuilder({ model, credentials });
}

// =============================================================================
// Provider-Specific Shortcuts
// =============================================================================

/**
 * Groq-specific builder shortcuts with streaming support
 */
export const groq = {
  /** Fastest model - 560 tokens/sec */
  instant: (apiKey: string) => Object.assign(quick("groq:llama-3.1-8b-instant", { groqApiKey: apiKey }), {
    stream: async (prompt: string): Promise<Stream<string>> => {
      const builder = quick("groq:llama-3.1-8b-instant", { groqApiKey: apiKey });
      return builder.stream(prompt);
    }
  }),
  
  /** Balanced model - 280 tokens/sec */
  versatile: (apiKey: string) => Object.assign(quick("groq:llama-3.3-70b-versatile", { groqApiKey: apiKey }), {
    stream: async (prompt: string): Promise<Stream<string>> => {
      const builder = quick("groq:llama-3.3-70b-versatile", { groqApiKey: apiKey });
      return builder.stream(prompt);
    }
  }),
  
  /** OpenAI OSS models */
  gpt120b: (apiKey: string) => Object.assign(quick("groq:openai/gpt-oss-120b", { groqApiKey: apiKey }), {
    stream: async (prompt: string): Promise<Stream<string>> => {
      const builder = quick("groq:openai/gpt-oss-120b", { groqApiKey: apiKey });
      return builder.stream(prompt);
    }
  }),
  
  gpt20b: (apiKey: string) => Object.assign(quick("groq:openai/gpt-oss-20b", { groqApiKey: apiKey }), {
    stream: async (prompt: string): Promise<Stream<string>> => {
      const builder = quick("groq:openai/gpt-oss-20b", { groqApiKey: apiKey });
      return builder.stream(prompt);
    }
  }),
  
  /** Specialized models */
  guard: (apiKey: string) => quick("groq:meta-llama/llama-guard-4-12b", { groqApiKey: apiKey }),
  compound: (apiKey: string) => quick("groq:groq/compound", { groqApiKey: apiKey }),
  compoundMini: (apiKey: string) => quick("groq:groq/compound-mini", { groqApiKey: apiKey }),
};

/**
 * Gemini-specific builder shortcuts
 */
export const gemini = {
  /** Latest Gemini 3 series */
  pro3: (apiKey: string) => quick("gemini:gemini-3-pro-preview", { geminiApiKey: apiKey }),
  flash3: (apiKey: string) => quick("gemini:gemini-3-flash-preview", { geminiApiKey: apiKey }),
  
  /** Gemini 2.5 series */
  pro25: (apiKey: string) => quick("gemini:gemini-2.5-pro", { geminiApiKey: apiKey }),
  flash25: (apiKey: string) => quick("gemini:gemini-2.5-flash", { geminiApiKey: apiKey }),
  
  /** Gemini 2.0 series (recommended) */
  flash: (apiKey: string) => quick("gemini:gemini-2.0-flash", { geminiApiKey: apiKey }),
  lite: (apiKey: string) => quick("gemini:gemini-2.0-flash-lite", { geminiApiKey: apiKey }),
  
  /** Stable 1.5 series */
  pro: (apiKey: string) => quick("gemini:gemini-1.5-pro-002", { geminiApiKey: apiKey }),
  flash15: (apiKey: string) => quick("gemini:gemini-1.5-flash-002", { geminiApiKey: apiKey }),
};

/**
 * Cloudflare-specific builder shortcuts
 */
export const cloudflare = {
  // OpenAI Models
  /** GPT-OSS 120B - Production use */
  gpt120b: (creds: { apiKey: string; email: string; accountId: string }) =>
    quick("cloudflare:@cf/openai/gpt-oss-120b", {
      cloudflareApiKey: creds.apiKey,
      cloudflareEmail: creds.email,
      cloudflareAccountId: creds.accountId,
    }),
  
  /** GPT-OSS 20B - Lower latency */
  gpt20b: (creds: { apiKey: string; email: string; accountId: string }) =>
    quick("cloudflare:@cf/openai/gpt-oss-20b", {
      cloudflareApiKey: creds.apiKey,
      cloudflareEmail: creds.email,
      cloudflareAccountId: creds.accountId,
    }),

  // Meta Llama Models  
  /** Llama 4 Scout - Multimodal */
  llama4: (creds: { apiKey: string; email: string; accountId: string }) =>
    quick("cloudflare:@cf/meta/llama-4-scout-17b-16e-instruct", {
      cloudflareApiKey: creds.apiKey,
      cloudflareEmail: creds.email,
      cloudflareAccountId: creds.accountId,
    }),
  
  /** Llama 3.3 70B - Fast quantized */
  llama70b: (creds: { apiKey: string; email: string; accountId: string }) => 
    quick("cloudflare:@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
      cloudflareApiKey: creds.apiKey,
      cloudflareEmail: creds.email,
      cloudflareAccountId: creds.accountId,
    }),
  
  /** Llama 3.1 8B - Lightweight */
  llama8b: (creds: { apiKey: string; email: string; accountId: string }) =>
    quick("cloudflare:@cf/meta/llama-3.1-8b-instruct", {
      cloudflareApiKey: creds.apiKey,
      cloudflareEmail: creds.email,
      cloudflareAccountId: creds.accountId,
    }),

  // Specialized Models
  /** QwQ 32B - Reasoning specialist */
  reasoning: (creds: { apiKey: string; email: string; accountId: string }) =>
    quick("cloudflare:@cf/qwen/qwq-32b", {
      cloudflareApiKey: creds.apiKey,
      cloudflareEmail: creds.email,
      cloudflareAccountId: creds.accountId,
    }),
  
  /** Qwen 2.5 Coder - Code specialist */
  coder: (creds: { apiKey: string; email: string; accountId: string }) =>
    quick("cloudflare:@cf/qwen/qwen2.5-coder-32b-instruct", {
      cloudflareApiKey: creds.apiKey,
      cloudflareEmail: creds.email,
      cloudflareAccountId: creds.accountId,
    }),
  
  /** IBM Granite - Enterprise */
  granite: (creds: { apiKey: string; email: string; accountId: string }) =>
    quick("cloudflare:@cf/ibm/granite-4.0-h-micro", {
      cloudflareApiKey: creds.apiKey,
      cloudflareEmail: creds.email,
      cloudflareAccountId: creds.accountId,
    }),
};

// =============================================================================
// Model-specific Configurations
// =============================================================================

/**
 * Model-specific streaming configurations
 * Each model might have different requirements for optimal streaming
 */
const MODEL_CONFIGS: Record<string, {
  maxTokens: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[] | null;
  streamingFormat?: 'standard' | 'gpt-oss' | 'gemma';
}> = {
  // GPT-OSS models (OpenAI open source on Groq)
  'openai/gpt-oss-120b': {
    maxTokens: 4096,
    temperature: 0.7,
    topP: 1.0,
    stopSequences: null,
    streamingFormat: 'standard', // Uses standard OpenAI format
  },
  'openai/gpt-oss-20b': {
    maxTokens: 4096,
    temperature: 0.7,
    topP: 1.0,
    stopSequences: null,
    streamingFormat: 'standard',
  },
  // Llama models
  'llama-3.1-8b-instant': {
    maxTokens: 2048,
    temperature: 0.7,
    streamingFormat: 'standard',
  },
  'llama-3.3-70b-versatile': {
    maxTokens: 2048,
    temperature: 0.7,
    streamingFormat: 'standard',
  },
  // Mixtral models
  'mixtral-8x7b-32768': {
    maxTokens: 32768,
    temperature: 0.7,
    streamingFormat: 'standard',
  },
  // Gemma models on Groq
  'gemma2-9b-it': {
    maxTokens: 2048,
    temperature: 0.7,
    streamingFormat: 'standard',
  },
};

/**
 * Get model configuration with fallbacks
 */
function getModelConfig(model: string) {
  const config = MODEL_CONFIGS[model] || {};
  return {
    maxTokens: config.maxTokens || 2048,
    temperature: config.temperature || 0.7,
    topP: config.topP,
    stopSequences: config.stopSequences,
    streamingFormat: config.streamingFormat || 'standard',
  };
}

// =============================================================================
// Streaming Implementation Functions
// =============================================================================

/**
 * Create Groq streaming ReadableStream
 */
async function createGroqStream(
  model: string,
  messages: Array<{ role: string; content: string }>,
  apiKey: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<ReadableStream<string>> {
  // Get model-specific configuration with overrides from options
  const config = getModelConfig(model);
  
  const requestBody: any = {
    model,
    messages,
    stream: true,
    temperature: options?.temperature ?? config.temperature,
    max_tokens: options?.maxTokens ?? config.maxTokens,
  };
  
  // Add optional parameters if specified
  if (config.topP !== undefined) {
    requestBody.top_p = config.topP;
  }
  if (config.stopSequences !== undefined) {
    requestBody.stop = config.stopSequences;
  }

  console.log(`[unilmp] Starting Groq streaming for ${model}`, {
    config,
    messageCount: messages.length,
    lastMessage: messages[messages.length - 1]?.content?.substring(0, 50)
  });

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
    console.error(`[unilmp] Groq API error for ${model}:`, errorText);
    throw new Error(`Groq streaming failed: ${response.status} - ${errorText}`);
  }

  if (!response.body) {
    throw new Error("No response body for Groq streaming");
  }

  console.log(`[unilmp] Groq streaming response received for ${model}`);

  // Buffer for incomplete lines
  let buffer = '';
  let chunkCount = 0;

  return response.body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new TransformStream({
      transform(chunk, controller) {
        // Append new chunk to buffer
        buffer += chunk;
        
        // Process complete lines
        const lines = buffer.split('\n');
        
        // Keep the last incomplete line in buffer
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed === '') continue;
          
          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6);
            
            if (data === '[DONE]') {
              console.log(`[unilmp] Stream completed for ${model}, total chunks: ${chunkCount}`);
              continue;
            }
            
            try {
              const parsed = JSON.parse(data);
              
              // Handle both standard and potential GPT-OSS response formats
              let content = null;
              
              // Standard OpenAI format
              if (parsed.choices?.[0]?.delta?.content !== undefined) {
                content = parsed.choices[0].delta.content;
              }
              // Alternative format (if GPT-OSS uses different structure)
              else if (parsed.choices?.[0]?.text !== undefined) {
                content = parsed.choices[0].text;
              }
              // Another possible format
              else if (parsed.response !== undefined) {
                content = parsed.response;
              }
              
              if (content) {
                chunkCount++;
                if (chunkCount <= 3 || chunkCount % 100 === 0) {
                  console.log(`[unilmp] Chunk ${chunkCount} for ${model}:`, content.substring(0, 50));
                }
                controller.enqueue(content);
              } else if (parsed.choices?.[0]?.finish_reason) {
                console.log(`[unilmp] Finish reason for ${model}:`, parsed.choices[0].finish_reason);
              }
            } catch (e) {
              console.warn(`[unilmp] Failed to parse Groq SSE data for ${model}:`, data.substring(0, 100), e);
            }
          }
        }
      },
      
      flush(controller) {
        // Process any remaining data in buffer
        if (buffer.trim().startsWith('data: ')) {
          const data = buffer.trim().slice(6);
          if (data !== '[DONE]') {
            try {
              const parsed = JSON.parse(data);
              
              let content = null;
              if (parsed.choices?.[0]?.delta?.content !== undefined) {
                content = parsed.choices[0].delta.content;
              } else if (parsed.choices?.[0]?.text !== undefined) {
                content = parsed.choices[0].text;
              } else if (parsed.response !== undefined) {
                content = parsed.response;
              }
              
              if (content) {
                controller.enqueue(content);
              }
            } catch (e) {
              // Ignore incomplete final chunk
            }
          }
        }
        console.log(`[unilmp] Stream flush completed for ${model}`);
      }
    }));
}

/**
 * Create Gemini streaming ReadableStream
 */
async function createGeminiStream(
  model: string,
  messages: Array<{ role: string; content: string }>,
  apiKey: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<ReadableStream<string>> {
  // Convert messages to Gemini format
  const contents = messages
    .filter(m => m.role !== "system")
    .map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const systemInstruction = messages.find(m => m.role === "system")?.content;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents,
        ...(systemInstruction && { systemInstruction: { parts: [{ text: systemInstruction }] } }),
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxTokens ?? 2048,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini API error:", errorText);
    throw new Error(`Gemini streaming failed: ${response.status} - ${errorText}`);
  }

  if (!response.body) {
    throw new Error("No response body for Gemini streaming");
  }

  // Buffer for incomplete lines
  let buffer = '';
  
  return response.body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new TransformStream({
      transform(chunk, controller) {
        // Append new chunk to buffer
        buffer += chunk;
        
        // Process complete lines
        const lines = buffer.split('\n');
        
        // Keep the last incomplete line in buffer
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed === '') continue;
          
          // Gemini uses SSE format with alt=sse parameter
          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6);
            
            if (data === '[DONE]') {
              continue;
            }
            
            try {
              const parsed = JSON.parse(data);
              
              // Gemini streams text in candidates[0].content.parts[0].text
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                controller.enqueue(text);
              }
            } catch (e) {
              console.warn('Failed to parse Gemini SSE data:', data, e);
            }
          }
        }
      },
      
      flush(controller) {
        // Process any remaining data in buffer
        if (buffer.trim().startsWith('data: ')) {
          const data = buffer.trim().slice(6);
          if (data !== '[DONE]') {
            try {
              const parsed = JSON.parse(data);
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                controller.enqueue(text);
              }
            } catch (e) {
              // Ignore incomplete final chunk
            }
          }
        }
      }
    }));
}