#!/usr/bin/env npx tsx
/**
 * Test streaming functionality for each model
 * Run: GROQ_API_KEY="..." GEMINI_API_KEY="..." npx tsx test-streaming.ts
 */

import { unilmp } from "./src/fluent.js";
import type { Credentials } from "./src/types.js";

// Test configuration
const TEST_MODELS = [
  "groq:openai/gpt-oss-120b",
  "groq:openai/gpt-oss-20b", 
  "groq:llama-3.1-8b-instant",
  "groq:llama-3.3-70b-versatile",
  "gemini:gemini-2.0-flash",
  "gemini:gemini-1.5-flash",
];

const TEST_PROMPTS = {
  short: "Say hello in Japanese",
  medium: "Write a haiku about TypeScript programming",
  long: "Write a detailed story about a robot learning to paint. Include at least 3 characters, a plot twist, and make it at least 500 words long. Be creative and descriptive.",
};

// Get credentials from environment
const credentials: Credentials = {
  groqApiKey: process.env.GROQ_API_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY,
};

if (!credentials.groqApiKey) {
  console.error("❌ GROQ_API_KEY environment variable is required");
  process.exit(1);
}

/**
 * Test streaming for a specific model
 */
async function testModelStreaming(model: string, prompt: string, promptType: string) {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`🤖 Model: ${model}`);
  console.log(`📝 Prompt Type: ${promptType}`);
  console.log(`💬 Prompt: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`);
  console.log(`${"=".repeat(80)}`);

  const startTime = Date.now();
  let chunkCount = 0;
  let totalChars = 0;
  let fullResponse = "";
  let firstChunkTime = 0;
  let lastChunkTime = startTime;
  let error: any = null;

  try {
    // Create stream
    const stream = await unilmp()
      .model(model)
      .credentials(credentials)
      .maxTokens(model.includes('gpt-oss') ? 4096 : 2048)
      .temperature(0.7)
      .stream(prompt);

    console.log("✅ Stream created successfully");

    // Convert nagare Stream to ReadableStream for testing
    const reader = stream.toResponse().body?.getReader();
    if (!reader) {
      throw new Error("Failed to get reader from stream");
    }

    const decoder = new TextDecoder();
    console.log("\n📊 Streaming Progress:");
    console.log("-".repeat(40));

    // Read stream
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        console.log("\n✅ Stream completed");
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      chunkCount++;
      totalChars += chunk.length;
      fullResponse += chunk;

      // Track timing
      const now = Date.now();
      if (chunkCount === 1) {
        firstChunkTime = now - startTime;
        console.log(`⏱️  First chunk: ${firstChunkTime}ms`);
      }
      lastChunkTime = now;

      // Log progress every 10 chunks
      if (chunkCount % 10 === 0 || chunkCount <= 3) {
        console.log(`   Chunk ${chunkCount}: ${totalChars} chars total`);
      }

      // Show sample of content
      if (chunkCount <= 3) {
        console.log(`   > "${chunk.substring(0, 50)}${chunk.length > 50 ? '...' : ''}"`);
      }
    }
  } catch (err) {
    error = err;
    console.error(`\n❌ Error: ${err}`);
  }

  // Final statistics
  const totalTime = lastChunkTime - startTime;
  console.log("\n📈 Final Statistics:");
  console.log("-".repeat(40));
  console.log(`✅ Status: ${error ? 'FAILED' : 'SUCCESS'}`);
  console.log(`📦 Total chunks: ${chunkCount}`);
  console.log(`📝 Total characters: ${totalChars}`);
  console.log(`⏱️  Time to first chunk: ${firstChunkTime}ms`);
  console.log(`⏱️  Total time: ${totalTime}ms`);
  console.log(`🚀 Throughput: ${totalTime > 0 ? Math.round(totalChars / (totalTime / 1000)) : 0} chars/sec`);
  
  // Show response preview
  console.log("\n📄 Response Preview:");
  console.log("-".repeat(40));
  if (fullResponse.length <= 200) {
    console.log(fullResponse);
  } else {
    console.log(fullResponse.substring(0, 100) + "\n...\n" + fullResponse.substring(fullResponse.length - 100));
  }

  // Check for early termination
  if (promptType === "long" && totalChars < 500) {
    console.warn(`\n⚠️  Warning: Response seems too short for a long prompt (${totalChars} chars)`);
  }

  return {
    model,
    promptType,
    success: !error,
    chunkCount,
    totalChars,
    totalTime,
    firstChunkTime,
    error: error?.message,
  };
}

/**
 * Main test runner
 */
async function main() {
  console.log("🧪 Starting unilmp streaming tests");
  console.log("📦 Package: @aid-on/unilmp");
  console.log("📅 Date:", new Date().toISOString());
  console.log();

  const results: any[] = [];

  // Test each model with different prompt lengths
  for (const model of TEST_MODELS) {
    // Skip Gemini models if no API key
    if (model.startsWith("gemini:") && !credentials.geminiApiKey) {
      console.log(`⏭️  Skipping ${model} (no GEMINI_API_KEY)`);
      continue;
    }

    // Test with medium prompt (most models should handle this well)
    try {
      const result = await testModelStreaming(model, TEST_PROMPTS.medium, "medium");
      results.push(result);
      
      // Small delay between tests to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      console.error(`Failed to test ${model}:`, err);
      results.push({
        model,
        promptType: "medium",
        success: false,
        error: String(err),
      });
    }

    // For GPT-OSS models, also test long prompts to check for early termination
    if (model.includes("gpt-oss")) {
      try {
        console.log("\n🔬 Testing long prompt for early termination issues...");
        const result = await testModelStreaming(model, TEST_PROMPTS.long, "long");
        results.push(result);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        console.error(`Failed long prompt test for ${model}:`, err);
      }
    }
  }

  // Summary report
  console.log(`\n${"=".repeat(80)}`);
  console.log("📊 TEST SUMMARY");
  console.log(`${"=".repeat(80)}`);
  
  const successCount = results.filter(r => r.success).length;
  console.log(`✅ Success: ${successCount}/${results.length}`);
  console.log();

  // Table of results
  console.table(
    results.map(r => ({
      Model: r.model,
      Type: r.promptType,
      Status: r.success ? "✅" : "❌",
      Chunks: r.chunkCount || 0,
      Chars: r.totalChars || 0,
      "Time (ms)": r.totalTime || 0,
      "TTFC (ms)": r.firstChunkTime || 0,
      Error: r.error ? r.error.substring(0, 30) : "",
    }))
  );

  // Identify issues
  const issues = results.filter(r => !r.success || (r.promptType === "long" && r.totalChars < 500));
  if (issues.length > 0) {
    console.log("\n⚠️  ISSUES FOUND:");
    for (const issue of issues) {
      console.log(`- ${issue.model} (${issue.promptType}): ${issue.error || `Short response (${issue.totalChars} chars)`}`);
    }
  }

  // Exit with appropriate code
  process.exit(successCount === results.length ? 0 : 1);
}

// Run tests
main().catch(console.error);