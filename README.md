# @aid-on/unillm

[![npm version](https://img.shields.io/npm/v/@aid-on/unillm.svg)](https://www.npmjs.com/package/@aid-on/unillm)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**unillm** is a true edge-native unified LLM library - minimal dependencies (Zod only), WebStreams native, memory-optimized for edge computing environments.

[日本語版 README はこちら](./README.ja.md)

## Features

- ⚡ **Edge-Optimized**: ~50KB bundle (vs AI SDK ~200KB+), ~10ms cold start
- 🔄 **Unified Interface**: Same API for all providers (Groq, Gemini, Cloudflare)
- 🌊 **Web Streams Native**: Built on standard ReadableStream API
- 🎯 **Type-Safe**: Full TypeScript support with Zod schema validation
- 📦 **Minimal Dependencies**: Only Zod (~11KB) required
- 🚀 **nagare Integration**: Returns `Stream<T>` for reactive extensions

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

### Fluent Builder API (Recommended)

```typescript
import { unillm } from "@aid-on/unillm";

// Modern chainable API
const result = await unillm()
  .model("groq:llama-3.1-8b-instant")
  .credentials({ groqApiKey: process.env.GROQ_API_KEY })
  .temperature(0.7)
  .generate("Write a haiku about TypeScript");

console.log(result.text);
```

### Provider Shortcuts

```typescript
import { groq, gemini, cloudflare } from "@aid-on/unillm";

// Ultra-concise syntax
const result1 = await groq.instant(apiKey).generate("Hello");
const result2 = await gemini.flash(apiKey).generate("Hello");
const result3 = await cloudflare.gpt120b(creds).generate("Hello");
```

## nagare Stream Integration

unillm returns **@aid-on/nagare** `Stream<T>` for full compatibility with other Aid-On libraries:

```typescript
import { unillm } from "@aid-on/unillm";
import type { Stream } from "@aid-on/nagare";

// stream() method returns nagare Stream<string>
const stream: Stream<string> = await unillm()
  .model("groq:llama-3.3-70b-versatile")
  .credentials({ groqApiKey: "..." })
  .stream("Tell me a story");

// Use nagare's Fluent API
const enhanced = stream
  .map(chunk => chunk.toUpperCase())
  .filter(chunk => chunk.length > 0)
  .tap(chunk => console.log(`Streaming: ${chunk}`))
  .throttle(16)  // ~60fps
  .toSSE();      // Convert to Server-Sent Events
```

## Structured Output

```typescript
import { z } from "zod";

const PersonSchema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().email()
});

// Type-safe structured generation
const person = await unillm()
  .model("groq:llama-3.1-8b-instant")
  .credentials({ groqApiKey: "..." })
  .schema(PersonSchema)
  .generate("Generate a random person profile");

console.log(person.object.name); // Type-safe access
```

## Supported Providers

### Groq
- `groq:llama-3.3-70b-versatile` - Latest Llama 3.3 70B
- `groq:llama-3.1-8b-instant` - Fast 8B model
- `groq:mixtral-8x7b-32768` - Mixtral MoE

### Google Gemini
- `gemini:gemini-2.0-flash-exp` - Latest Gemini 2.0
- `gemini:gemini-1.5-pro` - Gemini 1.5 Pro
- `gemini:gemini-1.5-flash` - Fast Flash model

### Cloudflare Workers AI
- `cloudflare:@cf/meta/llama-3.1-8b-instruct` - Llama 3.1 8B
- `cloudflare:@cf/qwen/qwen1.5-14b-chat-awq` - Qwen 1.5 14B
- `cloudflare:@cf/openai/gpt-oss-120b` - GPT Open Source 120B

## API Reference

### Fluent Builder API

```typescript
const builder = unillm()
  .model(modelId)           // Set model
  .credentials(creds)       // Set API credentials
  .temperature(0.7)         // Set temperature (0-1)
  .maxTokens(1000)         // Set max tokens
  .topP(0.9)               // Set top-p sampling
  .schema(zodSchema)       // Set output schema
  .system(prompt)          // Set system prompt
  .messages(messages)      // Set conversation history
  
// Execute
await builder.generate(prompt)  // Generate text
await builder.stream(prompt)    // Stream response
```

### Legacy API (Backwards Compatible)

```typescript
import { generate, stream } from "@aid-on/unillm";

// Direct function calls
const result = await generate(
  "groq:llama-3.1-8b-instant",
  messages,
  { groqApiKey: "..." }
);

const streamResult = await stream(
  "gemini:gemini-2.0-flash",
  messages,
  { geminiApiKey: "..." }
);
```

## Memory Optimization

unillm is designed for edge environments with limited memory:

```typescript
import { createMemoryOptimizedStream } from "@aid-on/unillm";

// Automatic chunk size optimization
const stream = await createMemoryOptimizedStream(
  largeResponse,
  { maxMemory: 1024 * 1024 } // 1MB limit
);
```

## License

MIT