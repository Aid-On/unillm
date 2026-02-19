#!/usr/bin/env npx tsx
/**
 * LLM Provider Check Script
 * Test models using ModelSpec format: "provider:model"
 */

import type { CheckResult, CheckOptions, Credentials } from "../src/types.js";
import { generate, parseModelSpec, getCredentialsFromEnv, callCloudflareRest, callCloudflareRestStream } from "../src/factory.js";
import { MODELS, getModelInfo, DEFAULT_SPECS } from "../src/models.js";
import { unillm } from "../src/fluent.js";
import { getStreamHandler } from "../src/streaming-handlers.js";

const TEST_PROMPT = "Say 'Hello' in Japanese. Reply with just the greeting.";
const TEST_SYSTEM = "You are a helpful assistant. Keep responses brief.";

const colors = {
  reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m",
  red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m", cyan: "\x1b[36m",
};

// -- CLI Parsing --

const FLAG_MAP: Record<string, keyof CheckOptions> = {
  "--stream": "stream", "--tools": "tools", "--json": "json",
  "--verbose": "verbose", "-v": "verbose",
};

function parseArgs(): { specs: string[]; options: CheckOptions } {
  const args = process.argv.slice(2);
  const options: CheckOptions = {};
  const specs: string[] = [];

  for (const arg of args) {
    const key = FLAG_MAP[arg];
    if (key) { options[key] = true; continue; }
    if (arg === "--list" || arg === "-l") { printModelList(); process.exit(0); }
    if (arg === "--help" || arg === "-h") { printHelp(); process.exit(0); }
    if (!arg.startsWith("-")) specs.push(arg);
  }
  return { specs, options };
}

function printHelp() {
  console.log(`\nUsage: npx tsx scripts/check.ts <spec> [--stream] [--json] [--verbose] [--list]\n`);
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
      const tag = isDefault ? ` ${colors.green}(default)${colors.reset}` : "";
      console.log(`  ${colors.cyan}${m.spec}${colors.reset}${tag}`);
    }
    console.log();
  }
}

// -- Output --

function printHeader(spec: string) {
  const info = getModelInfo(spec);
  console.log(`\n${colors.cyan}${"=".repeat(60)}${colors.reset}`);
  console.log(`${colors.bold}${spec}${colors.reset}`);
  if (info) console.log(`${colors.dim}${info.name}${colors.reset}`);
  console.log(`${colors.cyan}${"=".repeat(60)}${colors.reset}\n`);
}

function printResult(result: CheckResult) {
  console.log(`${colors.yellow}Request:${colors.reset}`);
  console.log(colors.dim + JSON.stringify(result.request, null, 2) + colors.reset + "\n");
  if (result.success) {
    const text = result.rawResponse ? JSON.stringify(result.rawResponse, null, 2) : `"${result.response}"`;
    console.log(`${colors.green}Response:${colors.reset}\n${colors.dim}${text}${colors.reset}`);
    console.log(`${colors.green}Success${colors.reset} (${result.responseTime}ms)`);
  } else {
    console.log(`${colors.red}Error: ${result.error}${colors.reset}`);
  }
}

// -- Helpers --

interface CloudflareGptOssOutput { type: string; role: string; content?: Array<{ text?: string }> }

function extractCloudflareResponse(model: string, cfResult: Record<string, unknown>): string {
  const result = cfResult.result as Record<string, unknown>;
  if (model.includes("gpt-oss")) {
    const output = result.output as CloudflareGptOssOutput[];
    const msg = output.find((o) => o.type === "message" && o.role === "assistant");
    return msg?.content?.[0]?.text ?? "No response";
  }
  return (result.response as string) ?? "No response";
}

function buildTestMessages(): Array<{ role: string; content: string }> {
  return [{ role: "system", content: TEST_SYSTEM }, { role: "user", content: TEST_PROMPT }];
}

function getProviderApiKey(provider: string, creds: Credentials): string | undefined {
  if (provider === 'groq') return creds.groqApiKey;
  if (provider === 'gemini') return creds.geminiApiKey;
  return undefined;
}

interface ErrorParams { spec: string; provider: string; model: string; startTime: number; error: unknown; request: CheckResult["request"] }

function makeErrorResult(p: ErrorParams): CheckResult {
  return {
    spec: p.spec, provider: p.provider, model: p.model, success: false,
    responseTime: Date.now() - p.startTime,
    error: p.error instanceof Error ? p.error.message : String(p.error),
    request: p.request,
  };
}

// -- Test: Basic --

async function testBasic(spec: string, credentials: Credentials, verbose: boolean): Promise<CheckResult> {
  const startTime = Date.now();
  const { provider, model } = parseModelSpec(spec);
  const request: CheckResult["request"] = { model: spec, messages: buildTestMessages(), temperature: 0.3 };
  try {
    if (provider === "cloudflare") {
      const cfResult = await callCloudflareRest(model, request.messages, credentials);
      const responseTime = Date.now() - startTime;
      if (!cfResult.success) return { spec, provider, model, success: false, responseTime, error: JSON.stringify(cfResult.errors), request };
      return { spec, provider, model, success: true, responseTime, response: extractCloudflareResponse(model, cfResult), request, rawResponse: verbose ? cfResult : undefined };
    }
    const result = await generate(spec, buildTestMessages(), credentials, { temperature: 0.3 });
    return { spec, provider, model, success: true, responseTime: Date.now() - startTime, response: result.text, request, rawResponse: verbose ? { text: result.text, usage: result.usage } : undefined };
  } catch (error) {
    return makeErrorResult({ spec, provider, model, startTime, error, request });
  }
}

// -- Test: Stream --

async function collectStream(spec: string, model: string, provider: string, creds: Credentials): Promise<string> {
  const handler = getStreamHandler(model);
  if (handler && typeof handler === 'object' && 'createStream' in handler) {
    const stream = await handler.createStream(buildTestMessages(), getProviderApiKey(provider, creds));
    const reader = stream.getReader();
    let text = "";
    try { while (true) { const { done, value } = await reader.read(); if (done) break; process.stdout.write(value); text += value; } }
    finally { reader.releaseLock(); }
    return text;
  }
  const stream = await unillm().model(spec).credentials(creds).system(TEST_SYSTEM).user(TEST_PROMPT).stream();
  let text = "";
  for await (const chunk of stream) { process.stdout.write(chunk); text += chunk; }
  return text;
}

async function testStream(spec: string, credentials: Credentials): Promise<CheckResult> {
  const startTime = Date.now();
  const { provider, model } = parseModelSpec(spec);
  const request: CheckResult["request"] = { model: spec, messages: buildTestMessages() };
  try {
    console.log(`${colors.yellow}Streaming...${colors.reset}`);
    process.stdout.write(colors.dim);
    let fullText: string;
    if (provider === "cloudflare") {
      fullText = "";
      for await (const chunk of callCloudflareRestStream(model, request.messages, credentials)) { process.stdout.write(chunk); fullText += chunk; }
    } else {
      fullText = await collectStream(spec, model, provider, credentials);
    }
    process.stdout.write(colors.reset + "\n\n");
    return { spec, provider, model, success: true, responseTime: Date.now() - startTime, response: fullText, request };
  } catch (error) {
    return makeErrorResult({ spec, provider, model, startTime, error, request });
  }
}

// -- Main --

async function main() {
  const { specs, options } = parseArgs();
  if (specs.length === 0) { printHelp(); process.exit(1); }

  const credentials = getCredentialsFromEnv();
  const results: CheckResult[] = [];

  for (const spec of specs) {
    if (!getModelInfo(spec)) { console.error(`${colors.red}Unknown model: ${spec}${colors.reset}`); process.exit(1); }
    if (!options.json) printHeader(spec);
    const result = options.stream ? await testStream(spec, credentials) : await testBasic(spec, credentials, options.verbose ?? false);
    if (!options.json) printResult(result);
    results.push(result);
  }

  if (options.json) console.log(JSON.stringify(results, null, 2));
  process.exit(results.some((r) => !r.success) ? 1 : 0);
}

main().catch((error) => { console.error(colors.red + "Fatal error:" + colors.reset, error); process.exit(1); });
