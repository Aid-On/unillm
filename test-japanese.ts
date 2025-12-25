#!/usr/bin/env npx tsx
import { unilmp } from "./src/fluent.js";

const credentials = {
  groqApiKey: process.env.GROQ_API_KEY || "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",
};

async function test() {
  console.log("🇯🇵 Testing Japanese generation with gpt-oss-120b");
  console.log("Prompt: 四字熟語10個いって");
  console.log("=" + "=".repeat(79));
  
  const stream = await unilmp()
    .model("groq:openai/gpt-oss-120b")
    .credentials(credentials)
    .maxTokens(8192)  // Explicit high token limit
    .temperature(0.7)
    .stream("四字熟語10個いって");

  const reader = stream.toResponse().body?.getReader();
  if (!reader) throw new Error("No reader");

  const decoder = new TextDecoder();
  let fullResponse = "";
  let chunkCount = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value, { stream: true });
    fullResponse += chunk;
    chunkCount++;
    
    // Show progress
    if (chunkCount % 50 === 0) {
      process.stdout.write(".");
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("✅ Response complete");
  console.log(`📊 Chunks: ${chunkCount}, Characters: ${fullResponse.length}`);
  console.log("\n📝 Full Response:");
  console.log(fullResponse);
}

test().catch(console.error);
