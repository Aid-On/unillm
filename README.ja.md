# @aid-on/unillm

[![npm version](https://img.shields.io/npm/v/@aid-on/unillm.svg)](https://www.npmjs.com/package/@aid-on/unillm)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**unillm** は真のエッジネイティブ統一LLMライブラリです - 最小依存（Zodのみ）、WebStreamsネイティブ、エッジコンピューティング環境向けにメモリ最適化されています。

[English README is here](./README.md)

## 特徴

- ⚡ **エッジ最適化**: ~50KBバンドル（AI SDK ~200KB+比）、~10msコールドスタート
- 🔄 **統一インターフェース**: 全プロバイダー（Groq、Gemini、Cloudflare）で同じAPI
- 🌊 **Web Streamsネイティブ**: 標準ReadableStream API基盤
- 🎯 **型安全**: Zodスキーマ検証付きの完全TypeScriptサポート
- 📦 **最小依存**: Zod（~11KB）のみ必要
- 🚀 **nagare統合**: リアクティブ拡張のための`Stream<T>`を返す

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

### Fluent Builder API（推奨）

```typescript
import { unillm } from "@aid-on/unillm";

// モダンなチェイン式API
const result = await unillm()
  .model("groq:llama-3.1-8b-instant")
  .credentials({ groqApiKey: process.env.GROQ_API_KEY })
  .temperature(0.7)
  .generate("TypeScriptについての俳句を書いて");

console.log(result.text);
```

### プロバイダーショートカット

```typescript
import { groq, gemini, cloudflare } from "@aid-on/unillm";

// 超簡潔な記法
const result1 = await groq.instant(apiKey).generate("こんにちは");
const result2 = await gemini.flash(apiKey).generate("こんにちは");
const result3 = await cloudflare.gpt120b(creds).generate("こんにちは");
```

## nagare Stream統合

unillmは **@aid-on/nagare** の `Stream<T>` を返すため、他のAid-Onライブラリと完全な互換性があります：

```typescript
import { unillm } from "@aid-on/unillm";
import type { Stream } from "@aid-on/nagare";

// stream()メソッドはnagare Stream<string>を返す
const stream: Stream<string> = await unillm()
  .model("groq:llama-3.3-70b-versatile")
  .credentials({ groqApiKey: "..." })
  .stream("物語を聞かせて");

// nagareのFluent APIが使える
const enhanced = stream
  .map(chunk => chunk.toUpperCase())
  .filter(chunk => chunk.length > 0)
  .tap(chunk => console.log(`ストリーミング中: ${chunk}`))
  .throttle(16)  // ~60fps
  .toSSE();      // Server-Sent Eventsに変換
```

## 構造化出力

```typescript
import { z } from "zod";

const PersonSchema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().email()
});

// 型安全な構造化生成
const person = await unillm()
  .model("groq:llama-3.1-8b-instant")
  .credentials({ groqApiKey: "..." })
  .schema(PersonSchema)
  .generate("ランダムな人物プロファイルを生成");

console.log(person.object.name); // 型安全なアクセス
```

## サポートプロバイダー

### Groq
- `groq:llama-3.3-70b-versatile` - 最新Llama 3.3 70B
- `groq:llama-3.1-8b-instant` - 高速8Bモデル
- `groq:mixtral-8x7b-32768` - Mixtral MoE

### Google Gemini
- `gemini:gemini-2.0-flash-exp` - 最新Gemini 2.0
- `gemini:gemini-1.5-pro` - Gemini 1.5 Pro
- `gemini:gemini-1.5-flash` - 高速Flashモデル

### Cloudflare Workers AI
- `cloudflare:@cf/meta/llama-3.1-8b-instruct` - Llama 3.1 8B
- `cloudflare:@cf/qwen/qwen1.5-14b-chat-awq` - Qwen 1.5 14B
- `cloudflare:@cf/openai/gpt-oss-120b` - GPTオープンソース120B

## APIリファレンス

### Fluent Builder API

```typescript
const builder = unillm()
  .model(modelId)           // モデル設定
  .credentials(creds)       // API認証情報設定
  .temperature(0.7)         // 温度設定（0-1）
  .maxTokens(1000)         // 最大トークン数設定
  .topP(0.9)               // top-pサンプリング設定
  .schema(zodSchema)       // 出力スキーマ設定
  .system(prompt)          // システムプロンプト設定
  .messages(messages)      // 会話履歴設定
  
// 実行
await builder.generate(prompt)  // テキスト生成
await builder.stream(prompt)    // ストリーミングレスポンス
```

### レガシーAPI（下位互換）

```typescript
import { generate, stream } from "@aid-on/unillm";

// 直接関数呼び出し
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

## メモリ最適化

unillmは限られたメモリのエッジ環境向けに設計されています：

```typescript
import { createMemoryOptimizedStream } from "@aid-on/unillm";

// 自動チャンクサイズ最適化
const stream = await createMemoryOptimizedStream(
  largeResponse,
  { maxMemory: 1024 * 1024 } // 1MB制限
);
```

## ライセンス

MIT