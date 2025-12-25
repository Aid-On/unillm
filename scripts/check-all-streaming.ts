#!/usr/bin/env npx tsx
/**
 * Comprehensive Streaming Test for All Models
 * 
 * Tests streaming capability for every model in unilmp library.
 * Each model is tested individually with proper error handling.
 */

import { MODELS, getModelsByProvider } from "../src/models.js";
import { getCredentialsFromEnv, parseModelSpec } from "../src/factory.js";
import { unilmp } from "../src/fluent.js";
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

// =============================================================================
// Streaming Test Function
// =============================================================================

async function testModelStreaming(
  modelInfo: ModelInfo,
  credentials: Credentials
): Promise<StreamTestResult> {
  const startTime = Date.now();
  const { provider, model } = parseModelSpec(modelInfo.spec);
  
  console.log(`\n${colors.cyan}Testing: ${modelInfo.spec}${colors.reset}`);
  console.log(`${colors.dim}  ${modelInfo.name}${colors.reset}`);

  try {
    let fullText = "";
    let chunkCount = 0;
    let hasStreaming = false;

    // Create promise with timeout
    const streamPromise = (async () => {
      // Handle Cloudflare models
      if (provider === "cloudflare") {
        const messages = [
          { role: "system", content: TEST_SYSTEM },
          { role: "user", content: TEST_PROMPT },
        ];

        try {
          for await (const chunk of callCloudflareRestStream(model, messages, credentials)) {
            fullText += chunk;
            chunkCount++;
            if (chunkCount === 1) {
              hasStreaming = true;
              process.stdout.write(`  ${colors.green}✓ Streaming works${colors.reset} - `);
            }
            process.stdout.write(colors.dim + "." + colors.reset);
          }
        } catch (streamError: any) {
          // Fallback to non-streaming if streaming fails
          console.log(`  ${colors.yellow}⚠ Streaming failed, testing non-streaming...${colors.reset}`);
          throw streamError;
        }
      } else {
        // Handle other providers
        const handler = getStreamHandler(model);
        
        if (handler && typeof handler === 'object' && 'createStream' in handler) {
          // Custom handler for models like gpt-oss
          const messages = [
            { role: "system", content: TEST_SYSTEM },
            { role: "user", content: TEST_PROMPT }
          ];
          const apiKey = provider === 'groq' ? credentials.groqApiKey : 
                         provider === 'gemini' ? credentials.geminiApiKey : undefined;
          
          const readableStream = await handler.createStream(messages, apiKey);
          const reader = readableStream.getReader();
          
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              fullText += value;
              chunkCount++;
              if (chunkCount === 1) {
                hasStreaming = true;
                process.stdout.write(`  ${colors.green}✓ Streaming works${colors.reset} - `);
              }
              process.stdout.write(colors.dim + "." + colors.reset);
            }
          } finally {
            reader.releaseLock();
          }
        } else {
          // Use fluent API
          const stream = await unilmp()
            .model(modelInfo.spec)
            .credentials(credentials)
            .system(TEST_SYSTEM)
            .user(TEST_PROMPT)
            .stream();
          
          for await (const chunk of stream) {
            fullText += chunk;
            chunkCount++;
            if (chunkCount === 1) {
              hasStreaming = true;
              process.stdout.write(`  ${colors.green}✓ Streaming works${colors.reset} - `);
            }
            process.stdout.write(colors.dim + "." + colors.reset);
          }
        }
      }
    })();

    // Apply timeout
    await Promise.race([
      streamPromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout")), TIMEOUT_MS)
      ),
    ]);

    process.stdout.write("\n");
    const responseTime = Date.now() - startTime;

    return {
      spec: modelInfo.spec,
      provider,
      model,
      name: modelInfo.name,
      success: true,
      streaming: hasStreaming,
      chunks: chunkCount,
      responseTime,
      response: fullText.substring(0, 100), // First 100 chars
    };
  } catch (error: any) {
    process.stdout.write("\n");
    const responseTime = Date.now() - startTime;
    
    console.log(`  ${colors.red}✗ Error: ${error.message}${colors.reset}`);
    
    return {
      spec: modelInfo.spec,
      provider,
      model,
      name: modelInfo.name,
      success: false,
      streaming: false,
      chunks: 0,
      responseTime,
      error: error.message,
    };
  }
}

// =============================================================================
// Main Test Runner
// =============================================================================

async function main() {
  console.log(`${colors.bold}=== Comprehensive Streaming Test for All Models ===${colors.reset}`);
  console.log(`Total models to test: ${MODELS.length}\n`);

  const credentials = getCredentialsFromEnv();
  const results: StreamTestResult[] = [];

  // Test by provider
  const providers = ["groq", "gemini", "cloudflare"] as const;
  
  for (const provider of providers) {
    const models = getModelsByProvider(provider);
    
    console.log(`\n${colors.bold}${colors.blue}━━━ ${provider.toUpperCase()} Models (${models.length}) ━━━${colors.reset}`);
    
    // Check if credentials exist
    const hasCredentials = 
      (provider === "groq" && credentials.groqApiKey) ||
      (provider === "gemini" && credentials.geminiApiKey) ||
      (provider === "cloudflare" && credentials.cloudflareAccountId && credentials.cloudflareApiKey);
    
    if (!hasCredentials) {
      console.log(`${colors.yellow}⚠️  No credentials for ${provider}, skipping...${colors.reset}`);
      for (const model of models) {
        results.push({
          spec: model.spec,
          provider,
          model: model.model,
          name: model.name,
          success: false,
          streaming: false,
          chunks: 0,
          responseTime: 0,
          error: "No credentials",
        });
      }
      continue;
    }
    
    // Test each model
    for (const model of models) {
      const result = await testModelStreaming(model, credentials);
      results.push(result);
      
      // Small delay between models to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // =============================================================================
  // Summary Report
  // =============================================================================

  console.log(`\n\n${colors.bold}=== SUMMARY REPORT ===${colors.reset}\n`);

  // Group results by provider
  for (const provider of providers) {
    const providerResults = results.filter(r => r.provider === provider);
    const successful = providerResults.filter(r => r.success && r.streaming);
    const failed = providerResults.filter(r => !r.success);
    const noStream = providerResults.filter(r => r.success && !r.streaming);
    
    console.log(`${colors.bold}${provider.toUpperCase()}:${colors.reset}`);
    console.log(`  ${colors.green}✓ Streaming works: ${successful.length}/${providerResults.length}${colors.reset}`);
    if (noStream.length > 0) {
      console.log(`  ${colors.yellow}⚠ No streaming: ${noStream.length}${colors.reset}`);
      noStream.forEach(r => console.log(`    - ${r.spec}`));
    }
    if (failed.length > 0) {
      console.log(`  ${colors.red}✗ Failed: ${failed.length}${colors.reset}`);
      failed.forEach(r => console.log(`    - ${r.spec}: ${r.error}`));
    }
    console.log();
  }

  // Overall statistics
  const total = results.length;
  const successfulStreaming = results.filter(r => r.success && r.streaming).length;
  const successfulNoStreaming = results.filter(r => r.success && !r.streaming).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`${colors.bold}OVERALL:${colors.reset}`);
  console.log(`  Total models tested: ${total}`);
  console.log(`  ${colors.green}Streaming supported: ${successfulStreaming}${colors.reset}`);
  console.log(`  ${colors.yellow}No streaming: ${successfulNoStreaming}${colors.reset}`);
  console.log(`  ${colors.red}Failed: ${failed}${colors.reset}`);

  // Save detailed results to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = `/Users/o6lvl4/workspace/github.com/Aid-On/aid-on-platform/packages/unilmp/streaming-test-results-${timestamp}.json`;
  
  const fs = await import("fs/promises");
  await fs.writeFile(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n${colors.dim}Detailed results saved to: ${reportPath}${colors.reset}`);

  // Exit with error if any failed
  process.exit(failed > 0 ? 1 : 0);
}

// Run the test
main().catch((error) => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});