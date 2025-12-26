#!/usr/bin/env npx tsx
/**
 * LLM Provider Check Script
 *
 * Test models using ModelSpec format: "provider:model"
 *
 * Usage:
 *   npx tsx scripts/check.ts groq:llama-3.1-8b-instant
 *   npx tsx scripts/check.ts gemini:gemini-2.0-flash
 *   npx tsx scripts/check.ts groq:llama-3.1-8b-instant --stream
 *   npx tsx scripts/check.ts gemini:gemini-2.0-flash --tools
 *   npx tsx scripts/check.ts --list                    # List all models
 *   npx tsx scripts/check.ts --json                    # JSON output
 */

import { z } from "zod";
import type { CheckResult, CheckOptions, ModelSpec, Credentials } from "../src/types.js";
import { generate, parseModelSpec, getCredentialsFromEnv, callCloudflareRest, callCloudflareRestStream } from "../src/factory.js";
import { MODELS, getModelInfo, DEFAULT_SPECS } from "../src/models.js";
import { unillm } from "../src/fluent.js";
import { getStreamHandler } from "../src/streaming-handlers.js";

// =============================================================================
// Configuration
// =============================================================================

const TEST_PROMPT = "Say 'Hello' in Japanese. Reply with just the greeting.";
const TEST_SYSTEM = "You are a helpful assistant. Keep responses brief.";

// =============================================================================
// CLI Parsing
// =============================================================================

function parseArgs(): { specs: string[]; options: CheckOptions } {
  const args = process.argv.slice(2);
  const options: CheckOptions = {};
  const specs: string[] = [];

  for (const arg of args) {
    if (arg === "--stream") {
      options.stream = true;
    } else if (arg === "--tools") {
      options.tools = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--verbose" || arg === "-v") {
      options.verbose = true;
    } else if (arg === "--list" || arg === "-l") {
      printModelList();
      process.exit(0);
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else if (!arg.startsWith("-")) {
      specs.push(arg);
    }
  }

  return { specs, options };
}

function printHelp() {
  console.log(`
LLM Provider Check Script

Usage:
  npx tsx scripts/check.ts <spec> [options]

Arguments:
  <spec>    Model spec in "provider:model" format
            Examples:
              groq:llama-3.1-8b-instant
              gemini:gemini-2.0-flash
              cloudflare:@cf/meta/llama-3.3-70b-instruct-fp8-fast

Options:
  --stream   Test streaming response
  --tools    Test tool calling
  --json     Output as JSON (for CI)
  --verbose  Show detailed response
  --list     List all available models
  --help     Show this help

Environment Variables:
  GROQ_API_KEY              Required for Groq models
  GEMINI_API_KEY            Required for Gemini models
  CLOUDFLARE_API_KEY        Required for Cloudflare models (REST API)
  CLOUDFLARE_EMAIL          Required for Cloudflare models (REST API)
  CLOUDFLARE_ACCOUNT_ID     Required for Cloudflare models (REST API)

Examples:
  npx tsx scripts/check.ts groq:llama-3.1-8b-instant
  npx tsx scripts/check.ts gemini:gemini-2.0-flash --verbose
  npx tsx scripts/check.ts groq:llama-3.1-8b-instant --stream
  npx tsx scripts/check.ts gemini:gemini-2.0-flash --tools
`);
}

function printModelList() {
  console.log("\nAvailable Models:\n");

  const byProvider: Record<string, typeof MODELS> = {};
  for (const m of MODELS) {
    if (!byProvider[m.provider]) byProvider[m.provider] = [];
    byProvider[m.provider].push(m);
  }

  for (const [provider, models] of Object.entries(byProvider)) {
    console.log(`${colors.bold}${provider.toUpperCase()}${colors.reset}`);
    for (const m of models) {
      const isDefault = DEFAULT_SPECS[m.provider as keyof typeof DEFAULT_SPECS] === m.spec;
      const defaultTag = isDefault ? ` ${colors.green}(default)${colors.reset}` : "";
      console.log(`  ${colors.cyan}${m.spec}${colors.reset}${defaultTag}`);
      console.log(`    ${colors.dim}${m.name} | ${m.contextWindow.toLocaleString()} tokens | ${m.speed} | ${m.cost}${colors.reset}`);
    }
    console.log();
  }
}

// =============================================================================
// Output Formatting
// =============================================================================

const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function printHeader(spec: string) {
  const info = getModelInfo(spec);
  const line = "═".repeat(60);
  console.log(`\n${colors.cyan}╔${line}╗${colors.reset}`);
  console.log(
    `${colors.cyan}║${colors.reset}  ${colors.bold}${spec}${colors.reset}`.padEnd(70) +
      `${colors.cyan}║${colors.reset}`
  );
  if (info) {
    console.log(
      `${colors.cyan}║${colors.reset}  ${colors.dim}${info.name}${colors.reset}`.padEnd(70) +
        `${colors.cyan}║${colors.reset}`
    );
  }
  console.log(`${colors.cyan}╚${line}╝${colors.reset}\n`);
}

function printRequest(request: CheckResult["request"]) {
  console.log(`${colors.yellow}📤 Request:${colors.reset}`);
  console.log(colors.dim + JSON.stringify(request, null, 2) + colors.reset);
  console.log();
}

function printResponse(result: CheckResult) {
  if (result.success) {
    console.log(`${colors.green}📥 Response:${colors.reset}`);
    if (result.rawResponse) {
      console.log(colors.dim + JSON.stringify(result.rawResponse, null, 2) + colors.reset);
    } else {
      console.log(colors.dim + `"${result.response}"` + colors.reset);
    }
    console.log();
    console.log(`${colors.green}✅ Success${colors.reset} (${result.responseTime}ms)`);
  } else {
    console.log(`${colors.red}❌ Error:${colors.reset}`);
    console.log(colors.red + result.error + colors.reset);
  }
}

// =============================================================================
// Test Functions
// =============================================================================

async function testBasic(
  spec: string,
  credentials: Credentials,
  verbose: boolean
): Promise<CheckResult> {
  const startTime = Date.now();
  const { provider, model } = parseModelSpec(spec);

  const request: CheckResult["request"] = {
    model: spec,
    messages: [
      { role: "system", content: TEST_SYSTEM },
      { role: "user", content: TEST_PROMPT },
    ],
    temperature: 0.3,
  };

  try {
    // For Cloudflare, use REST API (no Worker binding needed)
    if (provider === "cloudflare") {
      const cfResult = await callCloudflareRest(model, request.messages, credentials);
      const responseTime = Date.now() - startTime;

      if (!cfResult.success) {
        return {
          spec,
          provider,
          model,
          success: false,
          responseTime,
          error: JSON.stringify(cfResult.errors),
          request,
        };
      }

      // Extract response text based on model type
      let responseText: string;
      if (model.includes("gpt-oss")) {
        // gpt-oss models have different response format
        const output = cfResult.result.output;
        const assistantMessage = output.find((o: any) => o.type === "message" && o.role === "assistant");
        responseText = assistantMessage?.content?.[0]?.text || "No response";
      } else {
        // Standard models
        responseText = cfResult.result.response;
      }

      return {
        spec,
        provider,
        model,
        success: true,
        responseTime,
        response: responseText,
        request,
        rawResponse: verbose ? cfResult : undefined,
      };
    }

    // For other providers, use edge-native generate function
    const messages = [
      { role: "system", content: TEST_SYSTEM },
      { role: "user", content: TEST_PROMPT },
    ];

    const result = await generate(spec, messages, credentials, {
      temperature: 0.3,
    });

    const responseTime = Date.now() - startTime;

    return {
      spec,
      provider,
      model,
      success: true,
      responseTime,
      response: result.text,
      request,
      rawResponse: verbose
        ? {
            text: result.text,
            usage: result.usage,
          }
        : undefined,
    };
  } catch (error) {
    return {
      spec,
      provider,
      model,
      success: false,
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
      request,
    };
  }
}

async function testStream(
  spec: string,
  credentials: Credentials,
  verbose: boolean
): Promise<CheckResult> {
  const startTime = Date.now();
  const { provider, model } = parseModelSpec(spec);

  const request: CheckResult["request"] = {
    model: spec,
    messages: [
      { role: "system", content: TEST_SYSTEM },
      { role: "user", content: TEST_PROMPT },
    ],
  };

  try {
    console.log(`${colors.yellow}📤 Streaming...${colors.reset}`);

    let fullText = "";
    process.stdout.write(colors.dim);

    // For Cloudflare, use REST API streaming
    if (provider === "cloudflare") {
      for await (const chunk of callCloudflareRestStream(model, request.messages, credentials)) {
        process.stdout.write(chunk);
        fullText += chunk;
      }
    } else {
      // For other providers, use streaming handlers or fluent API
      const { provider: p, model: m } = parseModelSpec(spec);
      const handler = getStreamHandler(m);
      
      if (handler && typeof handler === 'object' && 'createStream' in handler) {
        // Use custom streaming handler for models like gpt-oss
        const messages = [
          { role: "system", content: TEST_SYSTEM },
          { role: "user", content: TEST_PROMPT }
        ];
        const apiKey = p === 'groq' ? credentials.groqApiKey : 
                       p === 'gemini' ? credentials.geminiApiKey : undefined;
        
        const readableStream = await handler.createStream(messages, apiKey);
        const reader = readableStream.getReader();
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            process.stdout.write(value);
            fullText += value;
          }
        } finally {
          reader.releaseLock();
        }
      } else {
        // Use fluent API for standard models
        const stream = await unillm()
          .model(spec)
          .credentials(credentials)
          .system(TEST_SYSTEM)
          .user(TEST_PROMPT)
          .stream();
        
        for await (const chunk of stream) {
          process.stdout.write(chunk);
          fullText += chunk;
        }
      }
    }

    process.stdout.write(colors.reset + "\n\n");

    const responseTime = Date.now() - startTime;

    return {
      spec,
      provider,
      model,
      success: true,
      responseTime,
      response: fullText,
      request,
    };
  } catch (error) {
    return {
      spec,
      provider,
      model,
      success: false,
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
      request,
    };
  }
}

async function testTools(
  spec: string,
  credentials: Credentials,
  verbose: boolean
): Promise<CheckResult> {
  const startTime = Date.now();
  const { provider, model } = parseModelSpec(spec);

  const toolPrompt = "What is the weather in Tokyo?";

  const request: CheckResult["request"] = {
    model: spec,
    messages: [
      { role: "system", content: "You have access to a weather tool." },
      { role: "user", content: toolPrompt },
    ],
  };

  try {
    // Cloudflare REST API doesn't support tool calling in CLI
    if (provider === "cloudflare") {
      console.log(`${colors.yellow}⚠️  Cloudflare REST API: tool calling not supported, using basic request${colors.reset}\n`);
      return testBasic(spec, credentials, verbose);
    }

    const llmModel = getModel(spec, credentials);

    const weatherTool = tool({
      description: "Get the weather for a city",
      parameters: z.object({
        city: z.string().describe("The city name"),
      }),
      execute: async ({ city }) => {
        return { city, temperature: 15, condition: "Cloudy" };
      },
    });

    const result = await generateText({
      model: llmModel,
      system: "You have access to a weather tool. Use it to answer questions.",
      prompt: toolPrompt,
      tools: { weather: weatherTool },
      maxSteps: 2,
    });

    const responseTime = Date.now() - startTime;

    return {
      spec,
      provider,
      model,
      success: true,
      responseTime,
      response: result.text,
      request,
      rawResponse: verbose
        ? {
            text: result.text,
            toolCalls: result.toolCalls,
            toolResults: result.toolResults,
            usage: result.usage,
          }
        : undefined,
    };
  } catch (error) {
    return {
      spec,
      provider,
      model,
      success: false,
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
      request,
    };
  }
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  const { specs, options } = parseArgs();

  if (specs.length === 0) {
    printHelp();
    process.exit(1);
  }

  const credentials = getCredentialsFromEnv();
  const results: CheckResult[] = [];

  for (const spec of specs) {
    // Validate spec
    const info = getModelInfo(spec);
    if (!info) {
      console.error(`${colors.red}Unknown model: ${spec}${colors.reset}`);
      console.error(`Use --list to see available models.`);
      process.exit(1);
    }

    if (!options.json) {
      printHeader(spec);
    }

    let result: CheckResult;

    if (options.tools) {
      result = await testTools(spec, credentials, options.verbose ?? false);
    } else if (options.stream) {
      result = await testStream(spec, credentials, options.verbose ?? false);
    } else {
      result = await testBasic(spec, credentials, options.verbose ?? false);
    }

    if (!options.json) {
      printRequest(result.request);
      printResponse(result);
    }

    results.push(result);
  }

  if (options.json) {
    console.log(JSON.stringify(results, null, 2));
  }

  // Exit with error code if any test failed
  const hasFailure = results.some((r) => !r.success);
  process.exit(hasFailure ? 1 : 0);
}

main().catch((error) => {
  console.error(colors.red + "Fatal error:" + colors.reset, error);
  process.exit(1);
});
