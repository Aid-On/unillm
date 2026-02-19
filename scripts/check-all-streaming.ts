#!/usr/bin/env npx tsx
/** Comprehensive Streaming Test for All Models */

import { MODELS, getModelsByProvider } from "../src/models.js";
import { getCredentialsFromEnv, parseModelSpec } from "../src/factory.js";
import { unillm } from "../src/fluent.js";
import { callCloudflareRestStream } from "../src/factory.js";
import { getStreamHandler } from "../src/streaming-handlers.js";
import type { ModelInfo, Credentials } from "../src/types.js";

// =============================================================================
// Configuration
// =============================================================================

const TEST_PROMPT = "Count from 1 to 3 slowly.";
const TEST_SYSTEM = "You are a helpful assistant. Keep responses very brief.";
const TIMEOUT_MS = 30000; // 30 seconds per model

// =============================================================================
// Colors for output
// =============================================================================

const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

// =============================================================================
// Test Result Types
// =============================================================================

interface StreamTestResult {
  spec: string;
  provider: string;
  model: string;
  name: string;
  success: boolean;
  streaming: boolean;
  chunks: number;
  responseTime: number;
  response?: string;
  error?: string;
}

interface StreamAccumulator {
  fullText: string;
  chunkCount: number;
  hasStreaming: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

function buildTestMessages(): Array<{ role: string; content: string }> {
  return [
    { role: "system", content: TEST_SYSTEM },
    { role: "user", content: TEST_PROMPT },
  ];
}

function onFirstChunk(acc: StreamAccumulator): void {
  if (acc.chunkCount === 1) {
    acc.hasStreaming = true;
    process.stdout.write(`  ${colors.green}> Streaming works${colors.reset} - `);
  }
  process.stdout.write(colors.dim + "." + colors.reset);
}

function getProviderApiKey(provider: string, credentials: Credentials): string | undefined {
  if (provider === 'groq') return credentials.groqApiKey;
  if (provider === 'gemini') return credentials.geminiApiKey;
  return undefined;
}

// =============================================================================
// Provider-specific streaming
// =============================================================================

async function streamCloudflare(model: string, credentials: Credentials, acc: StreamAccumulator): Promise<void> {
  for await (const chunk of callCloudflareRestStream(model, buildTestMessages(), credentials)) {
    acc.fullText += chunk;
    acc.chunkCount++;
    onFirstChunk(acc);
  }
}

async function streamWithHandler(handler: { createStream: (messages: Array<{ role: string; content: string }>, apiKey: string | undefined) => Promise<ReadableStream<string>> }, provider: string, credentials: Credentials, acc: StreamAccumulator): Promise<void> {
  const apiKey = getProviderApiKey(provider, credentials);
  const readableStream = await handler.createStream(buildTestMessages(), apiKey);
  const reader = readableStream.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      acc.fullText += value;
      acc.chunkCount++;
      onFirstChunk(acc);
    }
  } finally {
    reader.releaseLock();
  }
}

async function streamWithFluentApi(spec: string, credentials: Credentials, acc: StreamAccumulator): Promise<void> {
  const stream = await unillm()
    .model(spec)
    .credentials(credentials)
    .system(TEST_SYSTEM)
    .user(TEST_PROMPT)
    .stream();

  for await (const chunk of stream) {
    acc.fullText += chunk;
    acc.chunkCount++;
    onFirstChunk(acc);
  }
}

// =============================================================================
// Streaming Test Function
// =============================================================================

async function runStreamTest(modelInfo: ModelInfo, credentials: Credentials): Promise<StreamAccumulator> {
  const { provider, model } = parseModelSpec(modelInfo.spec);
  const acc: StreamAccumulator = { fullText: "", chunkCount: 0, hasStreaming: false };

  if (provider === "cloudflare") {
    await streamCloudflare(model, credentials, acc);
    return acc;
  }

  const handler = getStreamHandler(model);
  if (handler && typeof handler === 'object' && 'createStream' in handler) {
    await streamWithHandler(handler as { createStream: (messages: Array<{ role: string; content: string }>, apiKey: string | undefined) => Promise<ReadableStream<string>> }, provider, credentials, acc);
    return acc;
  }

  await streamWithFluentApi(modelInfo.spec, credentials, acc);
  return acc;
}

async function testModelStreaming(
  modelInfo: ModelInfo,
  credentials: Credentials
): Promise<StreamTestResult> {
  const startTime = Date.now();
  const { provider, model } = parseModelSpec(modelInfo.spec);

  console.log(`\n${colors.cyan}Testing: ${modelInfo.spec}${colors.reset}`);
  console.log(`${colors.dim}  ${modelInfo.name}${colors.reset}`);

  try {
    const streamPromise = runStreamTest(modelInfo, credentials);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), TIMEOUT_MS)
    );
    const acc = await Promise.race([streamPromise, timeoutPromise]);

    process.stdout.write("\n");

    return {
      spec: modelInfo.spec, provider, model, name: modelInfo.name,
      success: true, streaming: acc.hasStreaming,
      chunks: acc.chunkCount, responseTime: Date.now() - startTime,
      response: acc.fullText.substring(0, 100),
    };
  } catch (error: unknown) {
    process.stdout.write("\n");
    const message = error instanceof Error ? error.message : String(error);
    console.log(`  ${colors.red}x Error: ${message}${colors.reset}`);

    return {
      spec: modelInfo.spec, provider, model, name: modelInfo.name,
      success: false, streaming: false,
      chunks: 0, responseTime: Date.now() - startTime,
      error: message,
    };
  }
}

// =============================================================================
// Credential Check
// =============================================================================

function hasProviderCredentials(provider: string, credentials: Credentials): boolean {
  if (provider === "groq") return !!credentials.groqApiKey;
  if (provider === "gemini") return !!credentials.geminiApiKey;
  if (provider === "cloudflare") return !!(credentials.cloudflareAccountId && credentials.cloudflareApiKey);
  return false;
}

function makeSkippedResult(model: ModelInfo, provider: string): StreamTestResult {
  return {
    spec: model.spec, provider, model: model.model, name: model.name,
    success: false, streaming: false, chunks: 0, responseTime: 0,
    error: "No credentials",
  };
}

// =============================================================================
// Summary Report
// =============================================================================

function printProviderSummary(provider: string, results: StreamTestResult[]): void {
  const providerResults = results.filter(r => r.provider === provider);
  const successful = providerResults.filter(r => r.success && r.streaming);
  const failed = providerResults.filter(r => !r.success);
  const noStream = providerResults.filter(r => r.success && !r.streaming);

  console.log(`${colors.bold}${provider.toUpperCase()}:${colors.reset}`);
  console.log(`  ${colors.green}> Streaming works: ${successful.length}/${providerResults.length}${colors.reset}`);
  if (noStream.length > 0) {
    console.log(`  ${colors.yellow}! No streaming: ${noStream.length}${colors.reset}`);
    noStream.forEach(r => console.log(`    - ${r.spec}`));
  }
  if (failed.length > 0) {
    console.log(`  ${colors.red}x Failed: ${failed.length}${colors.reset}`);
    failed.forEach(r => console.log(`    - ${r.spec}: ${r.error}`));
  }
  console.log();
}

function printOverallSummary(results: StreamTestResult[]): void {
  const total = results.length;
  const successfulStreaming = results.filter(r => r.success && r.streaming).length;
  const successfulNoStreaming = results.filter(r => r.success && !r.streaming).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`${colors.bold}OVERALL:${colors.reset}`);
  console.log(`  Total models tested: ${total}`);
  console.log(`  ${colors.green}Streaming supported: ${successfulStreaming}${colors.reset}`);
  console.log(`  ${colors.yellow}No streaming: ${successfulNoStreaming}${colors.reset}`);
  console.log(`  ${colors.red}Failed: ${failed}${colors.reset}`);
}

// =============================================================================
// Main Test Runner
// =============================================================================

async function main() {
  console.log(`${colors.bold}=== Comprehensive Streaming Test ===${colors.reset}`);
  console.log(`Total models to test: ${MODELS.length}\n`);

  const credentials = getCredentialsFromEnv();
  const results: StreamTestResult[] = [];
  const providers = ["groq", "gemini", "cloudflare"] as const;

  for (const provider of providers) {
    const models = getModelsByProvider(provider);
    console.log(`\n${colors.bold}${colors.blue}--- ${provider.toUpperCase()} Models (${models.length}) ---${colors.reset}`);

    if (!hasProviderCredentials(provider, credentials)) {
      console.log(`${colors.yellow}! No credentials for ${provider}, skipping...${colors.reset}`);
      for (const model of models) {
        results.push(makeSkippedResult(model, provider));
      }
      continue;
    }

    for (const model of models) {
      const result = await testModelStreaming(model, credentials);
      results.push(result);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Summary
  console.log(`\n\n${colors.bold}=== SUMMARY REPORT ===${colors.reset}\n`);
  for (const provider of providers) {
    printProviderSummary(provider, results);
  }
  printOverallSummary(results);

  // Save results
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = `./streaming-test-results-${timestamp}.json`;
  const fs = await import("fs/promises");
  await fs.writeFile(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n${colors.dim}Detailed results saved to: ${reportPath}${colors.reset}`);

  const failed = results.filter(r => !r.success).length;
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(`${colors.red}Fatal error: ${error instanceof Error ? error.message : String(error)}${colors.reset}`);
  process.exit(1);
});
