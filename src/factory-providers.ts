/**
 * Provider-Specific Factory Functions
 *
 * Edge-native implementations for each LLM provider's API.
 * Each function uses pure fetch API with no external dependencies.
 */

// =============================================================================
// Response Types
// =============================================================================

import type { ToolDefinition, ToolUseBlock, ContentBlock, AnyMessage } from "./types.js";

// =============================================================================
// Message Conversion Helpers
// =============================================================================

function isRichContent(content: unknown): content is ContentBlock[] {
  return Array.isArray(content) && content.length > 0 && typeof content[0] === "object" && "type" in content[0];
}

/**
 * Convert AnyMessage[] to OpenAI/Groq message format.
 * Handles tool_use → assistant with tool_calls, tool_result → tool role.
 */
function toOpenAIMessages(messages: Array<{ role: string; content: string | ContentBlock[] }>): unknown[] {
  const result: unknown[] = [];
  for (const msg of messages) {
    if (!isRichContent(msg.content)) {
      result.push({ role: msg.role, content: msg.content });
      continue;
    }

    // Rich content: split into text + tool blocks
    const textParts = msg.content.filter(b => b.type === "text");
    const toolUseParts = msg.content.filter(b => b.type === "tool_use");
    const toolResultParts = msg.content.filter(b => b.type === "tool_result");

    if (toolUseParts.length > 0) {
      // Assistant message with tool calls
      const text = textParts.map(b => b.type === "text" ? b.text : "").join("");
      result.push({
        role: "assistant",
        content: text || null,
        tool_calls: toolUseParts.map(b => {
          if (b.type !== "tool_use") return null;
          return {
            id: b.id,
            type: "function",
            function: { name: b.name, arguments: JSON.stringify(b.input) },
          };
        }).filter(Boolean),
      });
    } else if (toolResultParts.length > 0) {
      // Tool results → separate "tool" role messages
      for (const b of toolResultParts) {
        if (b.type !== "tool_result") continue;
        result.push({
          role: "tool",
          tool_call_id: b.tool_use_id,
          content: b.content,
        });
      }
    } else {
      // Text only
      const text = textParts.map(b => b.type === "text" ? b.text : "").join("");
      result.push({ role: msg.role, content: text });
    }
  }
  return result;
}

/**
 * Convert AnyMessage[] to Anthropic message format.
 * Anthropic natively supports content block arrays.
 */
function toAnthropicMessages(messages: Array<{ role: string; content: string | ContentBlock[] }>): unknown[] {
  const result: unknown[] = [];
  for (const msg of messages) {
    if (msg.role === "system") continue;
    if (!isRichContent(msg.content)) {
      result.push({ role: msg.role === "user" ? "user" : "assistant", content: msg.content });
      continue;
    }
    // Anthropic accepts content block arrays directly
    result.push({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content,
    });
  }
  return result;
}

interface ProviderResponse {
  text: string;
  toolCalls?: ToolUseBlock[];
  stopReason?: "end_turn" | "tool_use" | "max_tokens" | "stop";
  usage?: { promptTokens: number; completionTokens: number };
}

interface AnthropicApiResponse {
  content?: Array<{ type?: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }>;
  stop_reason?: string;
  usage?: { input_tokens: number; output_tokens: number };
}

interface OpenAIApiResponse {
  choices?: Array<{
    message?: {
      content?: string;
      tool_calls?: Array<{
        id: string;
        type: string;
        function: { name: string; arguments: string };
      }>;
    };
    finish_reason?: string;
  }>;
  usage?: { prompt_tokens: number; completion_tokens: number };
}

interface GeminiApiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  usageMetadata?: { promptTokenCount: number; candidatesTokenCount: number };
}

// =============================================================================
// Anthropic
// =============================================================================

export async function generateWithAnthropic(
  model: string,
  messages: Array<{ role: string; content: string | ContentBlock[] }>,
  apiKey: string,
  options: { temperature?: number; maxTokens?: number; tools?: ToolDefinition[]; toolChoice?: string } = {}
): Promise<ProviderResponse> {
  const systemMsg = messages.find(m => m.role === "system");
  const system = systemMsg ? (typeof systemMsg.content === "string" ? systemMsg.content : undefined) : undefined;
  const finalMessages = toAnthropicMessages(messages);

  const body: Record<string, unknown> = {
    model, messages: finalMessages, system,
    max_tokens: options.maxTokens || 4096,
    temperature: options.temperature || 0.7,
  };

  if (options.tools?.length) {
    body.tools = options.tools.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema,
    }));
    if (options.toolChoice === "required") body.tool_choice = { type: "any" };
    else if (options.toolChoice === "none") body.tool_choice = { type: "none" };
    else body.tool_choice = { type: "auto" };
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Anthropic API error: ${response.status} ${text}`);
  }

  const result = await response.json() as AnthropicApiResponse;
  const text = result.content?.filter(b => b.type === "text").map(b => b.text).join("") ?? "";
  const toolCalls: ToolUseBlock[] = (result.content ?? [])
    .filter(b => b.type === "tool_use")
    .map(b => ({ id: b.id!, name: b.name!, input: b.input! }));

  return {
    text,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    stopReason: result.stop_reason === "tool_use" ? "tool_use" : "end_turn",
    usage: result.usage ? {
      promptTokens: result.usage.input_tokens,
      completionTokens: result.usage.output_tokens,
    } : undefined,
  };
}

// =============================================================================
// OpenAI-Compatible Provider (shared by OpenAI, Groq, DeepSeek, Kimi)
// =============================================================================

async function generateWithOpenAICompat(
  baseUrl: string,
  providerName: string,
  model: string,
  messages: Array<{ role: string; content: string | ContentBlock[] }>,
  apiKey: string,
  options: { temperature?: number; maxTokens?: number; tools?: ToolDefinition[]; toolChoice?: string } = {}
): Promise<ProviderResponse> {
  const apiMessages = toOpenAIMessages(messages);
  const body: Record<string, unknown> = {
    model, messages: apiMessages,
    temperature: options.temperature || 0.7,
    max_tokens: options.maxTokens,
  };

  if (options.tools?.length) {
    body.tools = options.tools.map(t => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.inputSchema,
      },
    }));
    if (options.toolChoice === "required") body.tool_choice = "required";
    else if (options.toolChoice === "none") body.tool_choice = "none";
    else body.tool_choice = "auto";
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${providerName} API error: ${response.status} ${text}`);
  }

  const result = await response.json() as OpenAIApiResponse;
  const msg = result.choices?.[0]?.message;
  const finishReason = result.choices?.[0]?.finish_reason;

  const toolCalls: ToolUseBlock[] = (msg?.tool_calls ?? []).map(tc => ({
    id: tc.id,
    name: tc.function.name,
    input: JSON.parse(tc.function.arguments || "{}"),
  }));

  return {
    text: msg?.content || "",
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    stopReason: finishReason === "tool_calls" ? "tool_use" : "end_turn",
    usage: result.usage ? {
      promptTokens: result.usage.prompt_tokens,
      completionTokens: result.usage.completion_tokens,
    } : undefined,
  };
}

// Provider-specific wrappers using the shared implementation

export const generateWithOpenAI = (model: string, messages: Array<{ role: string; content: string | ContentBlock[] }>, apiKey: string, options?: { temperature?: number; maxTokens?: number; tools?: ToolDefinition[]; toolChoice?: string }) =>
  generateWithOpenAICompat("https://api.openai.com/v1", "OpenAI", model, messages, apiKey, options);

export const generateWithGroq = (model: string, messages: Array<{ role: string; content: string | ContentBlock[] }>, apiKey: string, options?: { temperature?: number; maxTokens?: number; tools?: ToolDefinition[]; toolChoice?: string }) =>
  generateWithOpenAICompat("https://api.groq.com/openai/v1", "Groq", model, messages, apiKey, options);

export const generateWithDeepSeek = (model: string, messages: Array<{ role: string; content: string | ContentBlock[] }>, apiKey: string, options?: { temperature?: number; maxTokens?: number; tools?: ToolDefinition[]; toolChoice?: string }) =>
  generateWithOpenAICompat("https://api.deepseek.com/v1", "DeepSeek", model, messages, apiKey, options);

export const generateWithKimi = (model: string, messages: Array<{ role: string; content: string | ContentBlock[] }>, apiKey: string, options?: { temperature?: number; maxTokens?: number; tools?: ToolDefinition[]; toolChoice?: string }) =>
  generateWithOpenAICompat("https://api.moonshot.ai/v1", "Kimi", model, messages, apiKey, options);

// =============================================================================
// Gemini
// =============================================================================

export async function generateWithGemini(
  model: string,
  messages: Array<{ role: string; content: string }>,
  apiKey: string,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ProviderResponse> {
  const contents = messages
    .filter(m => m.role !== "system")
    .map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const systemInstruction = messages.find(m => m.role === "system")?.content;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        ...(systemInstruction && { systemInstruction: { parts: [{ text: systemInstruction }] } }),
        generationConfig: {
          temperature: options.temperature || 0.7,
          maxOutputTokens: options.maxTokens,
        },
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${text}`);
  }

  const result = await response.json() as GeminiApiResponse;
  return {
    text: result.candidates?.[0]?.content?.parts?.[0]?.text || "",
    usage: result.usageMetadata ? {
      promptTokens: result.usageMetadata.promptTokenCount,
      completionTokens: result.usageMetadata.candidatesTokenCount,
    } : undefined,
  };
}

// Re-export Cloudflare functions
export {
  callCloudflareRest,
  callCloudflareRestStream,
  extractGptOssResponse,
} from "./factory-cloudflare.js";

export type { CloudflareRestResponse } from "./factory-cloudflare.js";
