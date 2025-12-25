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

## Supported Providers

### Groq
- `groq:llama-3.3-70b-versatile` - Llama 3.3 70B (recommended)
- `groq:llama-3.1-8b-instant` - Fast 8B model
- `groq:mixtral-8x7b-32768` - Mixtral MoE

### Google Gemini
- `gemini:gemini-2.0-flash-exp` - Gemini 2.0 experimental
- `gemini:gemini-1.5-pro` - Gemini 1.5 Pro
- `gemini:gemini-1.5-flash` - Fast flash model

### Cloudflare Workers AI
- `cloudflare:@cf/meta/llama-3.1-8b-instruct`
- `cloudflare:@cf/qwen/qwen1.5-14b-chat-awq`
- `cloudflare:@cf/openai/gpt-oss-120b`

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

### With Qwik Components

```typescript
import { component$, useSignal } from "@builder.io/qwik";
import { unillm } from "@aid-on/unillm";

export default component$(() => {
  const response = useSignal("");
  
  const handleGenerate = $(async () => {
    const stream = await unillm()
      .model("groq:llama-3.1-8b-instant")
      .credentials({ groqApiKey: import.meta.env.VITE_GROQ_API_KEY })
      .stream("Write a haiku");
    
    for await (const chunk of stream) {
      response.value += chunk;
    }
  });
  
  return <button onClick$={handleGenerate}>Generate</button>;
});
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