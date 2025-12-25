# @aid-on/unillm

**真のエッジネイティブ統一LLMライブラリ** - 軽量依存（Zod のみ）、WebStreams、メモリ最適化でエッジコンピューティング環境に特化。

## 🚀 なぜ unillm？

### ⚡ エッジ最適化設計
- **軽量バンドル**: ~50KB (vs AI SDK ~200KB+)
- **瞬時起動**: Cold start ~10ms (vs ~50ms+)
- **最小依存**: Zod のみ (~11KB)
- **WebStreams**: ReadableStream ネイティブ対応

### 🔄 統一インターフェース
```typescript
// すべてのプロバイダーで同じAPI
await generate("groq:llama-3.1-8b-instant", messages, credentials);
await generate("gemini:gemini-2.0-flash", messages, credentials);
await generate("cloudflare:@cf/openai/gpt-oss-120b", messages, credentials);
```

### 🎯 構造化出力
```typescript
// Fluent API
const person = await unilmp()
  .model("groq:llama-3.1-8b-instant")
  .credentials({ groqApiKey: "..." })
  .schema(z.object({ name: z.string(), age: z.number() }))
  .generate("Generate a person");

console.log(person.object.name); // 型安全
```

## 📦 インストール

```bash
npm install @aid-on/unilmp
```

## 🌊 nagare Stream<T> 統合

unilmp は **@aid-on/nagare** の `Stream<T>` を返すため、他の Aid-On ライブラリと完全な互換性があります。

```typescript
import { unilmp } from "@aid-on/unilmp";
import type { Stream } from "@aid-on/nagare";

// stream() メソッドは nagare Stream<string> を返す
const stream: Stream<string> = await unilmp()
  .model("groq:llama-3.3-70b-versatile")
  .credentials({ groqApiKey: "..." })
  .stream("Tell me a story");

// nagare の Fluent API が使える
const enhanced = stream
  .map(chunk => chunk.toUpperCase())
  .filter(chunk => chunk.length > 0)
  .tap(chunk => console.log(`Streaming: ${chunk}`))
  .throttle(16)  // ~60fps
  .toSSE();      // Server-Sent Events に変換

// Qwik components との統合 (@aid-on/qwiks)
import { useStreamText } from "@aid-on/qwiks";

const aiResponse = useStreamText(async () => {
  return await unilmp()
    .model("groq:llama-3.3-70b-versatile")
    .credentials({ groqApiKey })
    .stream("Hello");
});
```

## 🏃‍♂️ クイックスタート

### 🚀 Fluent Builder API (推奨)

```typescript
import { unilmp } from "@aid-on/unilmp";

// モダンなチェイン式API
const result = await unilmp()
  .model("groq:llama-3.1-8b-instant")
  .credentials({ groqApiKey: process.env.GROQ_API_KEY })
  .temperature(0.7)
  .generate("Hello in Japanese");

console.log(result.text); // "こんにちは"
```

### ⚡ プロバイダーショートカット

```typescript
import { groq, gemini, cloudflare } from "@aid-on/unilmp";

// 超簡潔な記法
const result1 = await groq.instant(apiKey).generate("Hello");
const result2 = await gemini.flash(apiKey).generate("Hello");
const result3 = await cloudflare.gpt120b(creds).generate("Hello");
```

### 🔧 従来API (下位互換)

```typescript
import { generate } from "@aid-on/unilmp";

// 従来の関数型API
const result = await generate(
  "groq:llama-3.1-8b-instant",
  [{ role: "user", content: "Hello in Japanese" }],
  { groqApiKey: process.env.GROQ_API_KEY }
);
```

## 📋 対応モデル (38モデル網羅)

### 🚀 Groq (7モデル) - 高速・コスパ最強
```typescript
// メインLLM
"groq:llama-3.1-8b-instant"      // ⚡560 tokens/sec 最高速
"groq:llama-3.3-70b-versatile"   // 🧠280 tokens/sec バランス
"groq:openai/gpt-oss-120b"       // 🏆最高性能 120B
"groq:openai/gpt-oss-20b"        // 🚀軽量高性能 20B

// 特殊用途
"groq:meta-llama/llama-guard-4-12b"  // 🛡️セーフティチェック
"groq:groq/compound"             // 🌐Web検索+コード実行
"groq:groq/compound-mini"        // 🌐軽量版Web検索+コード

// Fluent API
await groq.instant(key).generate("超高速応答");
await groq.compound(key).generate("Web検索して調べて");
```

### 🧠 Google Gemini (9モデル) - 高品質・マルチモーダル
```typescript
// Gemini 3 (最新)
"gemini:gemini-3-pro-preview"    // 🥇最高品質 (Preview)
"gemini:gemini-3-flash-preview"  // ⚡高速版 (Preview)

// Gemini 2.5 (高性能)
"gemini:gemini-2.5-pro"          // 🏆プロ版
"gemini:gemini-2.5-flash"        // ⚡高速版
"gemini:gemini-2.5-flash-lite"   // 🪶軽量版

// Gemini 2.0 (推奨)
"gemini:gemini-2.0-flash"        // ⚡推奨・安定版
"gemini:gemini-2.0-flash-lite"   // 🪶超軽量版

// Gemini 1.5 (安定版)
"gemini:gemini-1.5-pro-002"      // 🏛️安定プロ版
"gemini:gemini-1.5-flash-002"    // ⚡安定高速版

// Fluent API
await gemini.flash3(key).generate("最新Gemini 3");
await gemini.pro25(key).generate("最高品質");
await gemini.flash(key).generate("推奨安定版");
```

### ☁️ Cloudflare Workers AI (22モデル) - 無料・エッジ最適化
```typescript
// OpenAI Models
"cloudflare:@cf/openai/gpt-oss-120b"  // 🏆最高性能
"cloudflare:@cf/openai/gpt-oss-20b"   // 🚀高速版

// Meta Llama Models  
"cloudflare:@cf/meta/llama-4-scout-17b-16e-instruct"     // 🎨マルチモーダル
"cloudflare:@cf/meta/llama-3.3-70b-instruct-fp8-fast"   // ⚡量子化高速
"cloudflare:@cf/meta/llama-3.1-70b-instruct"            // 🧠大型版
"cloudflare:@cf/meta/llama-3.1-8b-instruct-fast"        // 🚀最適化版
"cloudflare:@cf/meta/llama-3.1-8b-instruct"             // 📱軽量版

// 企業・特殊用途
"cloudflare:@cf/ibm/granite-4.0-h-micro"                // 🏢企業向け
"cloudflare:@cf/mistralai/mistral-small-3.1-24b-instruct"  // 🇫🇷Mistral 24B
"cloudflare:@cf/mistralai/mistral-7b-instruct-v0.2"     // 🇫🇷Mistral 7B
"cloudflare:@cf/google/gemma-3-12b-it"                  // 🌍多言語対応
"cloudflare:@cf/qwen/qwq-32b"                           // 🤔推論特化
"cloudflare:@cf/qwen/qwen2.5-coder-32b-instruct"       // 💻コード特化
"cloudflare:@cf/qwen/qwen3-30b-a3b-fp8"                 // 🇨🇳最新Qwen

// Fluent API
await cloudflare.gpt120b(creds).generate("最高性能");
await cloudflare.llama4(creds).generate("マルチモーダル");  
await cloudflare.reasoning(creds).generate("推論問題");
await cloudflare.coder(creds).generate("コード生成");
```

## 🔧 認証設定

```typescript
import { getCredentialsFromEnv } from "@aid-on/unilmp";

// 環境変数から自動取得
const credentials = getCredentialsFromEnv();
// 読み込み: GROQ_API_KEY, GEMINI_API_KEY,
//          CLOUDFLARE_API_KEY, CLOUDFLARE_EMAIL, CLOUDFLARE_ACCOUNT_ID

// または直接指定
const credentials = {
  groqApiKey: "gsk_...",
  geminiApiKey: "AIza...",
  cloudflareApiKey: "...",
  cloudflareEmail: "you@example.com",
  cloudflareAccountId: "...",
};
```

## 🌊 エッジ環境での使用

### Cloudflare Workers

```typescript
import { cloudflare } from "@aid-on/unilmp";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { prompt } = await request.json();
    
    // Fluent API でシンプルに
    const result = await cloudflare
      .gpt120b({
        apiKey: env.CLOUDFLARE_API_KEY,
        email: env.CLOUDFLARE_EMAIL,
        accountId: env.CLOUDFLARE_ACCOUNT_ID,
      })
      .temperature(0.7)
      .system("You are a helpful assistant")
      .generate(prompt);
    
    return Response.json({ 
      response: result.text,
      usage: result.usage 
    });
  }
};
```

### Vercel Edge Functions

```typescript
import { groq } from "@aid-on/unilmp";

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  const { message } = await req.json();
  
  // 超簡潔なAPI
  const result = await groq
    .versatile(process.env.GROQ_API_KEY!)
    .temp(0.5)
    .generate(message);
  
  return new Response(result.text);
}
```

### Next.js App Router (Edge)

```typescript
import { unilmp } from "@aid-on/unilmp";
import { z } from "zod";

export const runtime = 'edge';

export async function POST(request: Request) {
  const { prompt } = await request.json();
  
  // 構造化応答 + Fluent API
  const analysis = await unilmp()
    .model("groq:llama-3.3-70b-versatile")
    .credentials({ groqApiKey: process.env.GROQ_API_KEY! })
    .system("You are a sentiment analyzer")
    .temp(0.3)
    .schema(z.object({
      sentiment: z.enum(["positive", "negative", "neutral"]),
      confidence: z.number().min(0).max(1),
      summary: z.string(),
    }))
    .generate(prompt);
  
  return Response.json(analysis.object);
}
```

## 🔁 リトライ・フォールバック

```typescript
import { unilmp, groq, gemini } from "@aid-on/unilmp";

// Fluent API でリトライ
const result = await unilmp()
  .model("groq:llama-3.1-8b-instant")
  .credentials(creds)
  .retries(3, 1000) // 3回、1秒間隔
  .generate("Hello");

// プロバイダーショートカットでフォールバック
async function generateWithFallback(prompt: string, creds: any) {
  try {
    return await groq.instant(creds.groqApiKey).generate(prompt);
  } catch (error) {
    console.warn("Groq failed, trying Gemini...");
    return await gemini.flash(creds.geminiApiKey).generate(prompt);
  }
}

// 会話型チェイン
const conversation = await unilmp()
  .model("groq:llama-3.3-70b-versatile")
  .credentials(creds)
  .system("You are a helpful assistant")
  .user("Hello")
  .assistant("Hi! How can I help?")
  .user("What's 2+2?")
  .temp(0.3)
  .retries(2)
  .generate();
```

## 💾 メモリ最適化

```typescript
import { unilmp, EdgeCache, StreamingBuffer } from "@aid-on/unilmp";

// Fluent API でメモリ最適化
const result = await unilmp()
  .model("groq:llama-3.3-70b-versatile")
  .credentials(creds)
  .messages(longConversationHistory) // 100個のメッセージ
  .optimize(2000) // 2000トークン以内に自動削減
  .compress() // 空白文字を自動圧縮
  .system("You are helpful")
  .generate("Continue the conversation");

// 手動最適化も可能
import { truncateMessages, compressMessage } from "@aid-on/unilmp";

const optimized = truncateMessages(longHistory, 2000);
const compressed = compressMessage("Hello    world\n\n\nHow are you?");

// ストリーミングバッファ (エッジ環境の制約対応)
const buffer = new StreamingBuffer(1024, (chunk) => {
  sendToClient(chunk); // 1KB毎に自動送信
});

// LRUキャッシュでレスポンス最適化
const cache = new EdgeCache<string>(100, 5 * 60 * 1000);
const cacheKey = `${model}:${prompt.slice(0, 50)}`;
const cached = cache.get(cacheKey);
if (!cached) {
  const result = await groq.instant(apiKey).generate(prompt);
  cache.set(cacheKey, result.text);
}
```

## 🌊 WebStreams API

```typescript
import {
  createCloudflareStream,
  cloudflareStreamToText,
  streamToResponse,
  streamToAsyncIterator,
} from "@aid-on/unilmp";

// Cloudflare Workers / Vercel Edge でのストリーミング
export async function POST(request: Request) {
  const { messages } = await request.json();
  
  // 1. CloudflareStreamChunk ストリーム作成
  const cloudflareStream = createCloudflareStream(
    "@cf/openai/gpt-oss-120b",
    messages,
    credentials
  );
  
  // 2. テキストストリームに変換
  const textStream = cloudflareStreamToText(cloudflareStream);
  
  // 3. Response として返却
  return streamToResponse(textStream, {
    headers: { "X-Model": "gpt-oss-120b" }
  });
}

// AsyncIterator として消費
for await (const chunk of streamToAsyncIterator(cloudflareStream)) {
  console.log(chunk.response); // ストリーミングテキスト
  if (chunk.finished) break;
}
```

## 🎯 構造化出力

```typescript
import { generateObject, extractJSON } from "@aid-on/unilmp";
import { z } from "zod";

// スキーマ定義
const ArticleSchema = z.object({
  title: z.string(),
  sections: z.array(z.object({
    heading: z.string(),
    content: z.string(),
    keywords: z.array(z.string()),
  })),
  metadata: z.object({
    wordCount: z.number(),
    readingTime: z.number(),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  }),
});

// 構造化生成
const article = await generateObject({
  model: "groq:llama-3.3-70b-versatile",
  credentials,
  schema: ArticleSchema,
  prompt: "Write an article about TypeScript",
  system: "You are a technical writer",
});

// 型安全アクセス
console.log(article.object.title);           // string
console.log(article.object.sections[0].heading); // string  
console.log(article.object.metadata.difficulty); // "beginner" | "intermediate" | "advanced"

// テキストからJSON抽出
const rawResponse = "Here's the data: {\"name\": \"John\", \"age\": 30}";
const person = extractJSON(rawResponse, z.object({
  name: z.string(),
  age: z.number(),
}));
```

## ❌ エラーハンドリング

```typescript
import { 
  LLMProviderError, 
  wrapError, 
  isRetryable,
  withRetry 
} from "@aid-on/unilmp";

try {
  const result = await generate("groq:llama-3.1-8b-instant", messages, credentials);
} catch (error) {
  const llmError = wrapError(error);
  
  console.log(llmError.code);     // 'RATE_LIMITED', 'TIMEOUT', etc.
  console.log(llmError.provider); // 'groq', 'gemini', 'cloudflare'
  console.log(llmError.retryable); // boolean
  
  if (isRetryable(llmError)) {
    // 自動リトライ
    const retryResult = await withRetry(
      () => generate("groq:llama-3.1-8b-instant", messages, credentials),
      { maxRetries: 3, baseDelay: 1000 }
    );
  }
}
```

## 📊 パフォーマンス比較

| 特徴 | @aid-on/unilmp | AI SDK直接 | @aid-on/unilmp-vercel-ai-sdk |
|------|----------------|-----------|------------------------------|
| バンドルサイズ | ~50KB | ~200KB+ | ~200KB+ |
| Cold start | ~10ms | ~50ms+ | ~50ms+ |
| メモリ使用量 | 最小 | 大 | 大 |
| 依存関係 | Zod のみ | 多数 | 多数 |
| エッジ最適化 | ✅ ネイティブ | ❌ | ✅ 互換 |
| 型安全性 | ✅ Zod | ✅ | ✅ |

## 🔗 関連パッケージ

- **[@aid-on/unilmp](.)** - エッジネイティブコアライブラリ（このパッケージ）
- **[@aid-on/unilmp-vercel-ai-sdk](../unilmp-vercel-ai-sdk)** - AI SDK互換ラッパー

## 🎯 マイグレーションガイド

### AI SDKから移行

```typescript
// Before (AI SDK)
import { generateText } from "ai";
import { createGroq } from "@ai-sdk/groq";

const groq = createGroq({ apiKey: "..." });
const result = await generateText({
  model: groq("llama-3.1-8b-instant"),
  prompt: "Hello",
});

// After (unilmp edge-native)
import { generate } from "@aid-on/unilmp";

const result = await generate(
  "groq:llama-3.1-8b-instant",
  [{ role: "user", content: "Hello" }],
  { groqApiKey: "..." }
);
```

### 段階的移行

AI SDK互換性が必要な場合は `@aid-on/unilmp-vercel-ai-sdk` を使用：

```typescript
// 段階1: AI SDK互換ラッパー使用
import { getModel } from "@aid-on/unilmp-vercel-ai-sdk";
import { generateText } from "ai";

const model = getModel("groq:llama-3.1-8b-instant", credentials);
const result = await generateText({ model, prompt: "Hello" });

// 段階2: 完全エッジネイティブ移行
import { generate } from "@aid-on/unilmp";

const result = await generate(
  "groq:llama-3.1-8b-instant", 
  [{ role: "user", content: "Hello" }], 
  credentials
);
```

## 📚 高度な使用例

### プロダクション環境での実装

```typescript
import { 
  unilmp,
  groq,
  EdgeCache,
  getMemoryEstimate,
} from "@aid-on/unilmp";

// リトライ付きキャッシュレイヤー
const responseCache = new EdgeCache<string>(1000, 10 * 60 * 1000);

async function intelligentGenerate(
  userInput: string,
  conversation: Array<{ role: string; content: string }>,
  credentials: any
) {
  // 1. メモリ最適化
  const memory = getMemoryEstimate();
  console.log(`Memory usage: ${memory.heapUsed}MB`);
  
  // 2. キャッシュ確認
  const cacheKey = `${userInput.slice(0, 50)}:${conversation.length}`;
  const cached = responseCache.get(cacheKey);
  if (cached) return { text: cached };
  
  // 3. Fluent API でフォールバック付き生成
  let result;
  try {
    // 主力モデル (自動最適化・リトライ付き)
    result = await unilmp()
      .model("groq:llama-3.3-70b-versatile")
      .credentials(credentials)
      .messages(conversation)
      .optimize(4000) // 4K tokens以内に自動削減
      .compress() // 空白圧縮
      .system("You are a helpful AI assistant")
      .temp(0.7)
      .retries(2, 500) // 2回リトライ、500ms間隔
      .generate(userInput);
  } catch (error) {
    console.warn("Primary model failed, using fallback");
    // 高速フォールバック
    result = await groq.instant(credentials.groqApiKey)
      .temp(0.5)
      .generate(userInput);
  }
  
  // 4. 結果をキャッシュ
  responseCache.set(cacheKey, result.text);
  
  return result;
}
```

### サーバーレス関数での最適化

```typescript
// Cloudflare Workers
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const { prompt } = await request.json();
      
      // 構造化応答で確実なJSON返却
      const analysis = await generateObject({
        model: "cloudflare:@cf/openai/gpt-oss-120b",
        credentials: {
          cloudflareApiKey: env.CLOUDFLARE_API_KEY,
          cloudflareEmail: env.CLOUDFLARE_EMAIL,
          cloudflareAccountId: env.CLOUDFLARE_ACCOUNT_ID,
        },
        schema: z.object({
          response: z.string(),
          sentiment: z.enum(["positive", "negative", "neutral"]),
          confidence: z.number().min(0).max(1),
        }),
        prompt,
        system: "Analyze and respond concisely",
      });
      
      return Response.json({
        ...analysis.object,
        usage: analysis.usage,
        provider: "cloudflare:gpt-oss-120b",
      });
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : "Unknown error" },
        { status: 500 }
      );
    }
  }
};
```

## 📊 API リファレンス

### 🔧 コア関数

| 関数 | 説明 |
|------|------|
| `generate(spec, messages, credentials, options?)` | 任意のプロバイダーでテキスト生成 |
| `generateWithGroq(model, messages, apiKey, options?)` | Groq直接呼び出し |
| `generateWithGemini(model, messages, apiKey, options?)` | Gemini直接呼び出し |
| `generateObject(options)` | Zodスキーマ付き構造化生成 |

### 🌊 WebStreams

| 関数 | 説明 |
|------|------|
| `createCloudflareStream(model, messages, creds)` | ReadableStream<CloudflareStreamChunk> |
| `cloudflareStreamToText(stream)` | ReadableStream<string> に変換 |
| `streamToResponse(stream, init?)` | Response オブジェクト作成 |
| `streamToAsyncIterator(stream)` | AsyncIterator 変換 |

### 💾 メモリ最適化

| 関数 | 説明 |
|------|------|
| `truncateMessages(messages, maxTokens)` | メッセージ履歴削減 |
| `compressMessage(content)` | 空白文字圧縮 |
| `StreamingBuffer(maxSize, onFlush?)` | 自動flushバッファ |
| `EdgeCache<T>(maxSize, ttl)` | LRUキャッシュ |
| `getMemoryEstimate()` | メモリ使用量取得 |

### 🔁 リトライ・エラー

| 関数 | 説明 |
|------|------|
| `withRetry(fn, config)` | 指数バックオフリトライ |
| `wrapError(error, provider?, context?)` | 統一エラー形式 |
| `isRetryable(error)` | リトライ可能判定 |

### 📋 ユーティリティ

| 関数 | 説明 |
|------|------|
| `parseModelSpec(spec)` | "provider:model" をパース |
| `createModelSpec(provider, model)` | spec文字列作成 |
| `hasCredentials(provider, creds)` | 認証情報確認 |
| `getCredentialsFromEnv()` | 環境変数から認証情報取得 |
| `getModelInfo(spec)` | モデルメタデータ取得 |
| `getAllSpecs()` | 全モデルspec一覧 |

## 🏆 モデル選択ガイド

### 🎯 用途別推奨モデル

```typescript
// ⚡ 超高速応答 (チャット、リアルタイム)
await groq.instant(key).generate(prompt);              // 560 tokens/sec

// 🧠 バランス重視 (汎用タスク)
await groq.versatile(key).generate(prompt);            // 280 tokens/sec
await gemini.flash(key).generate(prompt);              // 高品質

// 🏆 最高性能 (複雑なタスク)
await groq.gpt120b(key).generate(prompt);              // 120B parameters
await gemini.pro3(key).generate(prompt);               // 最新Gemini 3

// 💻 コード生成・プログラミング
await cloudflare.coder(creds).generate(prompt);       // Qwen Coder特化
await groq.compound(key).generate(prompt);             // Web検索+実行

// 🤔 推論・数学・論理問題
await cloudflare.reasoning(creds).generate(prompt);   // QwQ推論特化
await groq.gpt120b(key).generate(prompt);             // 高性能推論

// 🎨 マルチモーダル (画像・音声)
await cloudflare.llama4(creds).generate(prompt);      // Llama 4 Scout
await gemini.flash3(key).generate(prompt);            // Gemini 3

// 💰 コスト最適化 (大量処理)
await cloudflare.llama8b(creds).generate(prompt);     // 無料・軽量
await gemini.lite(key).generate(prompt);              // 低コスト

// 🛡️ セーフティ・モデレーション
await groq.guard(key).generate(prompt);               // Llama Guard専用

// 🏢 エンタープライズ・信頼性
await cloudflare.granite(creds).generate(prompt);     // IBM Granite
await gemini.pro(key).generate(prompt);               // 安定版Pro
```

### 🚀 パフォーマンス比較

| 用途 | 1st Choice | 2nd Choice | 3rd Choice |
|------|-----------|-----------|-----------|
| ⚡ 高速応答 | `groq.instant` (560 tok/s) | `groq.gpt20b` (1000 tok/s) | `gemini.lite` |
| 🧠 汎用タスク | `groq.versatile` | `gemini.flash` | `cloudflare.llama70b` |
| 🏆 最高性能 | `groq.gpt120b` | `gemini.pro3` | `cloudflare.gpt120b` |
| 💻 コード | `cloudflare.coder` | `groq.compound` | `groq.gpt120b` |
| 🤔 推論 | `cloudflare.reasoning` | `groq.gpt120b` | `gemini.pro25` |
| 💰 コスト | `cloudflare.llama8b` | `gemini.lite` | `groq.instant` |

### 2. エラーハンドリング戦略

```typescript
// 推奨パターン
try {
  return await withRetry(
    () => generate(primaryModel, messages, credentials),
    { maxRetries: 2, baseDelay: 500 }
  );
} catch (error) {
  // フォールバック
  return await generate(fallbackModel, messages, credentials);
}
```

### 3. メモリ効率化

```typescript
// エッジ環境での推奨設定
const optimizedMessages = truncateMessages(messages, 2000); // 2K tokens
const cache = new EdgeCache(50, 5 * 60 * 1000); // 50項目, 5分
const buffer = new StreamingBuffer(512); // 512B buffer
```

## 📄 ライセンス

MIT

---

## 🌟 v0.3.0 新機能

### ✨ Fluent Builder API
```typescript
// 🎨 美しいチェイン式API
const result = await unilmp()
  .model("groq:llama-3.3-70b-versatile")
  .credentials(creds)
  .system("You are a coding assistant")
  .temp(0.5)
  .retries(3)
  .optimize(4000)
  .compress()
  .generate("Create a React component");

// 🚀 プロバイダーショートカット
await groq.compound(key).generate("Search and code");
await gemini.flash3(key).generate("Latest AI model");
await cloudflare.reasoning(creds).generate("Solve this logic puzzle");
```

### 📊 **38モデル網羅** 
- **Groq**: 7モデル (超高速〜Web検索+コード実行)
- **Gemini**: 9モデル (Gemini 3〜1.5 全シリーズ)  
- **Cloudflare**: 22モデル (OpenAI OSS〜特化モデル)

### 🎯 **用途特化API**
- `groq.instant()` - 560 tokens/sec 最高速
- `cloudflare.coder()` - コード生成特化
- `cloudflare.reasoning()` - 推論問題特化
- `gemini.pro3()` - 最新最高品質
- `groq.compound()` - Web検索+コード実行

---

**@aid-on/unilmp** で次世代のエッジネイティブAIアプリケーションを構築しましょう！🚀