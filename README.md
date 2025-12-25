# @aid-on/unillm

[![npm version](https://img.shields.io/npm/v/@aid-on/unillm.svg)](https://www.npmjs.com/package/@aid-on/unillm)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**unillm** is a unified LLM interface for edge computing. It provides a consistent, type-safe API across multiple LLM providers with minimal dependencies and optimized memory usage for edge environments.

[日本語](./README.ja.md) | English

## Features

- 🚀 **Edge-First**: ~50KB bundle size, ~10ms cold start, optimized for edge runtimes
- 🔄 **Unified Interface**: Single API for Groq, Gemini, Cloudflare, and more
- 🌊 **Streaming Native**: Built on Web Streams API with nagare integration
- 🎯 **Type-Safe**: Full TypeScript support with Zod schema validation
- 📦 **Minimal Dependencies**: Only Zod (~11KB) required
- ⚡ **Memory Optimized**: Automatic chunking and backpressure handling

## Installation

```bash
npm install @aid-on/unillm
```

```bash
yarn add @aid-on/unillm
```

```bash
pnpm add @aid-on/unillm
```

## Quick Start

```typescript
import { unillm } from "@aid-on/unillm";

// Fluent API with type safety
const response = await unillm()
  .model("groq:llama-3.3-70b-versatile")
  .credentials({ groqApiKey: process.env.GROQ_API_KEY })
  .temperature(0.7)
  .generate("Explain quantum computing in simple terms");

console.log(response.text);
```

## Streaming with nagare

unillm returns **@aid-on/nagare** `Stream<T>` for reactive stream processing:

```typescript
import { unillm } from "@aid-on/unillm";
import type { Stream } from "@aid-on/nagare";

const stream: Stream<string> = await unillm()
  .model("groq:llama-3.3-70b-versatile")
  .credentials({ groqApiKey: "..." })
  .stream("Write a story about AI");

// Use nagare's reactive operators
const enhanced = stream
  .map(chunk => chunk.trim())
  .filter(chunk => chunk.length > 0)
  .throttle(16)  // ~60fps for UI updates
  .tap(chunk => console.log(chunk))
  .toSSE();      // Convert to Server-Sent Events
```

## Structured Output

Generate type-safe structured data with Zod schemas:

```typescript
import { z } from "zod";

const PersonSchema = z.object({
  name: z.string(),
  age: z.number(),
  skills: z.array(z.string())
});

const result = await unillm()
  .model("groq:llama-3.1-8b-instant")
  .credentials({ groqApiKey: "..." })
  .schema(PersonSchema)
  .generate("Generate a software engineer profile");

// Type-safe access
console.log(result.object.name);     // string
console.log(result.object.skills);   // string[]
```

## Provider Shortcuts

Ultra-concise syntax for common models:

```typescript
import { groq, gemini, cloudflare } from "@aid-on/unillm";

// One-liners for quick prototyping
await groq.instant("gsk_...").generate("Hello");
await gemini.flash("AIza...").generate("Hello");
await cloudflare.llama({ accountId: "...", apiToken: "..." }).generate("Hello");
```

## Supported Models (28 Models)

### Groq (7 models)
- `groq:llama-3.3-70b-versatile` - Llama 3.3 70B Versatile
- `groq:llama-3.1-8b-instant` - Llama 3.1 8B Instant
- `groq:meta-llama/llama-guard-4-12b` - Llama Guard 4 12B
- `groq:openai/gpt-oss-120b` - GPT-OSS 120B
- `groq:openai/gpt-oss-20b` - GPT-OSS 20B
- `groq:groq/compound` - Groq Compound
- `groq:groq/compound-mini` - Groq Compound Mini

### Google Gemini (8 models)
- `gemini:gemini-3-pro-preview` - Gemini 3 Pro Preview
- `gemini:gemini-3-flash-preview` - Gemini 3 Flash Preview
- `gemini:gemini-2.5-pro` - Gemini 2.5 Pro
- `gemini:gemini-2.5-flash` - Gemini 2.5 Flash
- `gemini:gemini-2.0-flash` - Gemini 2.0 Flash
- `gemini:gemini-2.0-flash-lite` - Gemini 2.0 Flash Lite
- `gemini:gemini-1.5-pro-002` - Gemini 1.5 Pro 002
- `gemini:gemini-1.5-flash-002` - Gemini 1.5 Flash 002

### Cloudflare Workers AI (13 models)
- `cloudflare:@cf/meta/llama-4-scout-17b-16e-instruct` - Llama 4 Scout
- `cloudflare:@cf/meta/llama-3.3-70b-instruct-fp8-fast` - Llama 3.3 70B FP8
- `cloudflare:@cf/meta/llama-3.1-70b-instruct` - Llama 3.1 70B
- `cloudflare:@cf/meta/llama-3.1-8b-instruct-fast` - Llama 3.1 8B Fast
- `cloudflare:@cf/meta/llama-3.1-8b-instruct` - Llama 3.1 8B
- `cloudflare:@cf/openai/gpt-oss-120b` - GPT-OSS 120B
- `cloudflare:@cf/openai/gpt-oss-20b` - GPT-OSS 20B
- `cloudflare:@cf/ibm/granite-4.0-h-micro` - IBM Granite 4.0
- `cloudflare:@cf/mistralai/mistral-small-3.1-24b-instruct` - Mistral Small 3.1
- `cloudflare:@cf/mistralai/mistral-7b-instruct-v0.2` - Mistral 7B
- `cloudflare:@cf/google/gemma-3-12b-it` - Gemma 3 12B
- `cloudflare:@cf/qwen/qwq-32b` - QwQ 32B
- `cloudflare:@cf/qwen/qwen2.5-coder-32b-instruct` - Qwen 2.5 Coder

## Advanced Usage

### Fluent Builder Pattern

```typescript
const builder = unillm()
  .model("groq:llama-3.3-70b-versatile")
  .credentials({ groqApiKey: "..." })
  .temperature(0.7)
  .maxTokens(1000)
  .topP(0.9)
  .system("You are a helpful assistant")
  .messages([
    { role: "user", content: "Previous question..." },
    { role: "assistant", content: "Previous answer..." }
  ]);

// Reusable configuration
const response1 = await builder.generate("New question");
const response2 = await builder.stream("Another question");
```

### Memory Optimization

Automatic memory management for edge environments:

```typescript
import { createMemoryOptimizedStream } from "@aid-on/unillm";

const stream = await createMemoryOptimizedStream(
  largeResponse,
  { 
    maxMemory: 1024 * 1024,  // 1MB limit
    chunkSize: 512           // Optimal chunk size
  }
);
```

### Error Handling

```typescript
import { UnillmError, RateLimitError } from "@aid-on/unillm";

try {
  const response = await unillm()
    .model("groq:llama-3.3-70b-versatile")
    .credentials({ groqApiKey: "..." })
    .generate("Hello");
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log(`Rate limited. Retry after ${error.retryAfter}ms`);
  } else if (error instanceof UnillmError) {
    console.log(`LLM error: ${error.message}`);
  }
}
```

## Integration Examples

### With React

```typescript
import { useState } from "react";
import { unillm } from "@aid-on/unillm";

export default function ChatComponent() {
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  
  const handleGenerate = async () => {
    setLoading(true);
    const stream = await unillm()
      .model("groq:llama-3.1-8b-instant")
      .credentials({ groqApiKey: import.meta.env.VITE_GROQ_API_KEY })
      .stream("Write a haiku");
    
    for await (const chunk of stream) {
      setResponse(prev => prev + chunk);
    }
    setLoading(false);
  };
  
  return (
    <div>
      <button onClick={handleGenerate} disabled={loading}>
        {loading ? "Generating..." : "Generate"}
      </button>
      <p>{response}</p>
    </div>
  );
}
```

### With Cloudflare Workers

```typescript
export default {
  async fetch(request: Request, env: Env) {
    const stream = await unillm()
      .model("cloudflare:@cf/meta/llama-3.1-8b-instruct")
      .credentials({
        accountId: env.CF_ACCOUNT_ID,
        apiToken: env.CF_API_TOKEN
      })
      .stream("Hello from the edge!");
    
    return new Response(stream.toReadableStream(), {
      headers: { "Content-Type": "text/event-stream" }
    });
  }
};
```

## API Reference

### unillm() Builder Methods

| Method | Description | Example |
|--------|-------------|---------|
| `model(id)` | Set the model ID | `model("groq:llama-3.3-70b-versatile")` |
| `credentials(creds)` | Set API credentials | `credentials({ groqApiKey: "..." })` |
| `temperature(n)` | Set temperature (0-1) | `temperature(0.7)` |
| `maxTokens(n)` | Set max tokens | `maxTokens(1000)` |
| `topP(n)` | Set top-p sampling | `topP(0.9)` |
| `schema(zod)` | Set output schema | `schema(PersonSchema)` |
| `system(text)` | Set system prompt | `system("You are...")` |
| `messages(msgs)` | Set message history | `messages([...])` |
| `generate(prompt)` | Generate response | `await generate("Hello")` |
| `stream(prompt)` | Stream response | `await stream("Hello")` |

## License

MIT