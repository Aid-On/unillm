# @aid-on/unillm

[![npm version](https://img.shields.io/npm/v/@aid-on/unillm.svg)](https://www.npmjs.com/package/@aid-on/unillm)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**unillm** はエッジコンピューティング向けの統一LLMインターフェースです。複数のLLMプロバイダーに対して一貫した型安全なAPIを提供し、最小限の依存関係とエッジ環境向けに最適化されたメモリ使用を実現します。

日本語 | [English](./README.md)

## 特徴

- 🚀 **エッジファースト**: ~50KBバンドルサイズ、~10msコールドスタート、エッジランタイム最適化
- 🔄 **統一インターフェース**: Groq、Gemini、Cloudflareなどに単一API
- 🌊 **ストリーミングネイティブ**: nagare統合でWeb Streams API基盤
- 🎯 **型安全**: Zodスキーマ検証付きの完全TypeScriptサポート
- 📦 **最小依存**: Zod（~11KB）のみ必要
- ⚡ **メモリ最適化**: 自動チャンキングとバックプレッシャー処理

## インストール

```bash
npm install @aid-on/unillm
```

```bash
yarn add @aid-on/unillm
```

```bash
pnpm add @aid-on/unillm
```

## クイックスタート

```typescript
import { unillm } from "@aid-on/unillm";

// 型安全なFluent API
const response = await unillm()
  .model("groq:llama-3.3-70b-versatile")
  .credentials({ groqApiKey: process.env.GROQ_API_KEY })
  .temperature(0.7)
  .generate("量子コンピューティングを簡単な言葉で説明して");

console.log(response.text);
```

## nagareでのストリーミング

unillmはリアクティブストリーム処理のために **@aid-on/nagare** `Stream<T>` を返します：

```typescript
import { unillm } from "@aid-on/unillm";
import type { Stream } from "@aid-on/nagare";

const stream: Stream<string> = await unillm()
  .model("groq:llama-3.3-70b-versatile")
  .credentials({ groqApiKey: "..." })
  .stream("AIについての物語を書いて");

// nagareのリアクティブオペレーターを使用
const enhanced = stream
  .map(chunk => chunk.trim())
  .filter(chunk => chunk.length > 0)
  .throttle(16)  // UI更新用 ~60fps
  .tap(chunk => console.log(chunk))
  .toSSE();      // Server-Sent Eventsに変換
```

## 構造化出力

Zodスキーマで型安全な構造化データを生成：

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
  .generate("ソフトウェアエンジニアのプロフィールを生成");

// 型安全なアクセス
console.log(result.object.name);     // string
console.log(result.object.skills);   // string[]
```

## プロバイダーショートカット

一般的なモデル用の超簡潔な構文：

```typescript
import { groq, gemini, cloudflare } from "@aid-on/unillm";

// クイックプロトタイピング用ワンライナー
await groq.instant("gsk_...").generate("こんにちは");
await gemini.flash("AIza...").generate("こんにちは");
await cloudflare.llama({ accountId: "...", apiToken: "..." }).generate("こんにちは");
```

## サポートモデル（全28モデル）

### Groq（7モデル）
- `groq:llama-3.3-70b-versatile` - Llama 3.3 70B Versatile
- `groq:llama-3.1-8b-instant` - Llama 3.1 8B Instant
- `groq:meta-llama/llama-guard-4-12b` - Llama Guard 4 12B
- `groq:openai/gpt-oss-120b` - GPT-OSS 120B
- `groq:openai/gpt-oss-20b` - GPT-OSS 20B
- `groq:groq/compound` - Groq Compound
- `groq:groq/compound-mini` - Groq Compound Mini

### Google Gemini（8モデル）
- `gemini:gemini-3-pro-preview` - Gemini 3 Pro Preview
- `gemini:gemini-3-flash-preview` - Gemini 3 Flash Preview
- `gemini:gemini-2.5-pro` - Gemini 2.5 Pro
- `gemini:gemini-2.5-flash` - Gemini 2.5 Flash
- `gemini:gemini-2.0-flash` - Gemini 2.0 Flash
- `gemini:gemini-2.0-flash-lite` - Gemini 2.0 Flash Lite
- `gemini:gemini-1.5-pro-002` - Gemini 1.5 Pro 002
- `gemini:gemini-1.5-flash-002` - Gemini 1.5 Flash 002

### Cloudflare Workers AI（13モデル）
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

## 高度な使用法

### Fluent Builderパターン

```typescript
const builder = unillm()
  .model("groq:llama-3.3-70b-versatile")
  .credentials({ groqApiKey: "..." })
  .temperature(0.7)
  .maxTokens(1000)
  .topP(0.9)
  .system("あなたは親切なアシスタントです")
  .messages([
    { role: "user", content: "以前の質問..." },
    { role: "assistant", content: "以前の回答..." }
  ]);

// 再利用可能な設定
const response1 = await builder.generate("新しい質問");
const response2 = await builder.stream("別の質問");
```

### メモリ最適化

エッジ環境向け自動メモリ管理：

```typescript
import { createMemoryOptimizedStream } from "@aid-on/unillm";

const stream = await createMemoryOptimizedStream(
  largeResponse,
  { 
    maxMemory: 1024 * 1024,  // 1MB制限
    chunkSize: 512           // 最適チャンクサイズ
  }
);
```

### エラー処理

```typescript
import { UnillmError, RateLimitError } from "@aid-on/unillm";

try {
  const response = await unillm()
    .model("groq:llama-3.3-70b-versatile")
    .credentials({ groqApiKey: "..." })
    .generate("こんにちは");
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log(`レート制限。${error.retryAfter}ms後に再試行`);
  } else if (error instanceof UnillmError) {
    console.log(`LLMエラー: ${error.message}`);
  }
}
```

## 統合例

### Reactとの統合

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
      .stream("俳句を書いて");
    
    for await (const chunk of stream) {
      setResponse(prev => prev + chunk);
    }
    setLoading(false);
  };
  
  return (
    <div>
      <button onClick={handleGenerate} disabled={loading}>
        {loading ? "生成中..." : "生成"}
      </button>
      <p>{response}</p>
    </div>
  );
}
```

### Cloudflare Workersとの統合

```typescript
export default {
  async fetch(request: Request, env: Env) {
    const stream = await unillm()
      .model("cloudflare:@cf/meta/llama-3.1-8b-instruct")
      .credentials({
        accountId: env.CF_ACCOUNT_ID,
        apiToken: env.CF_API_TOKEN
      })
      .stream("エッジからこんにちは！");
    
    return new Response(stream.toReadableStream(), {
      headers: { "Content-Type": "text/event-stream" }
    });
  }
};
```

## APIリファレンス

### unillm() Builderメソッド

| メソッド | 説明 | 例 |
|--------|------|-----|
| `model(id)` | モデルIDを設定 | `model("groq:llama-3.3-70b-versatile")` |
| `credentials(creds)` | API認証情報を設定 | `credentials({ groqApiKey: "..." })` |
| `temperature(n)` | 温度を設定（0-1） | `temperature(0.7)` |
| `maxTokens(n)` | 最大トークン数を設定 | `maxTokens(1000)` |
| `topP(n)` | top-pサンプリングを設定 | `topP(0.9)` |
| `schema(zod)` | 出力スキーマを設定 | `schema(PersonSchema)` |
| `system(text)` | システムプロンプトを設定 | `system("あなたは...")` |
| `messages(msgs)` | メッセージ履歴を設定 | `messages([...])` |
| `generate(prompt)` | レスポンスを生成 | `await generate("こんにちは")` |
| `stream(prompt)` | レスポンスをストリーム | `await stream("こんにちは")` |

## ライセンス

MIT