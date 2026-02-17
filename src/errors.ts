/**
 * Error Types for LLM Provider
 *
 * Unified error handling across all providers (Groq, Gemini, Cloudflare)
 */

import type { ProviderType } from "./types.js";

/**
 * Error codes for categorization
 */
export type LLMErrorCode =
  | "RATE_LIMIT"      // 429 - Too many requests
  | "AUTH"            // 401/403 - Authentication/Authorization failed
  | "TIMEOUT"         // Request timeout
  | "INVALID_RESPONSE" // Invalid or unparseable response
  | "NETWORK"         // Network connectivity issues
  | "SERVER_ERROR"    // 500+ server errors
  | "VALIDATION"      // Schema validation failed
  | "UNKNOWN";        // Unknown error

/**
 * Main error class for LLM provider errors
 */
export class LLMProviderError extends Error {
  readonly code: LLMErrorCode;
  readonly provider: ProviderType | "unknown";
  readonly retryable: boolean;
  readonly statusCode?: number;
  readonly cause?: Error;

  constructor(options: {
    message: string;
    code: LLMErrorCode;
    provider?: ProviderType;
    statusCode?: number;
    retryable?: boolean;
    cause?: Error;
  }) {
    super(options.message);
    this.name = "LLMProviderError";
    this.code = options.code;
    this.provider = options.provider ?? "unknown";
    this.statusCode = options.statusCode;
    this.retryable = options.retryable ?? isRetryableCode(options.code);
    this.cause = options.cause;

    // Maintains proper stack trace for where our error was thrown (only in V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, LLMProviderError);
    }
  }

  /**
   * Create a user-friendly error message
   */
  toUserMessage(): string {
    switch (this.code) {
      case "RATE_LIMIT":
        return "Too many requests. Please wait a moment and try again.";
      case "AUTH":
        return "Authentication failed. Please check your API credentials.";
      case "TIMEOUT":
        return "Request timed out. Please try again.";
      case "INVALID_RESPONSE":
        return "Received an invalid response from the AI service.";
      case "NETWORK":
        return "Network error. Please check your connection.";
      case "SERVER_ERROR":
        return "The AI service is temporarily unavailable. Please try again later.";
      case "VALIDATION":
        return "The response did not match the expected format.";
      default:
        return "An unexpected error occurred.";
    }
  }
}

/**
 * Determine if an error code is retryable by default
 */
export function isRetryableCode(code: LLMErrorCode): boolean {
  switch (code) {
    case "RATE_LIMIT":
    case "TIMEOUT":
    case "NETWORK":
    case "SERVER_ERROR":
      return true;
    case "AUTH":
    case "INVALID_RESPONSE":
    case "VALIDATION":
    case "UNKNOWN":
      return false;
  }
}

/**
 * Parse an HTTP status code to an error code
 */
export function statusToErrorCode(status: number): LLMErrorCode {
  if (status === 429) return "RATE_LIMIT";
  if (status === 401 || status === 403) return "AUTH";
  if (status === 408) return "TIMEOUT";
  if (status >= 500) return "SERVER_ERROR";
  return "UNKNOWN";
}

/**
 * Detect error code from message content
 */
function detectErrorCode(lowerMessage: string): { code: LLMErrorCode; statusCode?: number } {
  const patterns: Array<{ keywords: string[]; code: LLMErrorCode; statusCode?: number }> = [
    { keywords: ["rate limit", "429"], code: "RATE_LIMIT", statusCode: 429 },
    { keywords: ["timeout", "timed out"], code: "TIMEOUT" },
    { keywords: ["unauthorized", "authentication", "api key", "401", "403"], code: "AUTH" },
    { keywords: ["network", "econnrefused", "enotfound", "fetch failed"], code: "NETWORK" },
    { keywords: ["500", "internal server"], code: "SERVER_ERROR", statusCode: 500 },
  ];
  for (const pattern of patterns) {
    if (pattern.keywords.some(k => lowerMessage.includes(k))) {
      return { code: pattern.code, statusCode: pattern.statusCode };
    }
  }
  return { code: "UNKNOWN" };
}

/**
 * Wrap any error into an LLMProviderError
 */
export function wrapError(
  error: unknown,
  provider?: ProviderType,
  context?: string
): LLMProviderError {
  if (error instanceof LLMProviderError) {
    return error;
  }

  if (error instanceof Error) {
    const message = context ? `${context}: ${error.message}` : error.message;
    const detected = detectErrorCode(error.message.toLowerCase());
    return new LLMProviderError({
      message,
      code: detected.code,
      provider,
      statusCode: detected.statusCode,
      cause: error,
    });
  }

  return new LLMProviderError({
    message: context ? `${context}: ${String(error)}` : String(error),
    code: "UNKNOWN",
    provider,
  });
}

/**
 * Check if an error is an LLMProviderError with a specific code
 */
export function isLLMError(
  error: unknown,
  code?: LLMErrorCode
): error is LLMProviderError {
  if (!(error instanceof LLMProviderError)) return false;
  if (code === undefined) return true;
  return error.code === code;
}

/**
 * Check if an error is retryable
 */
export function isRetryable(error: unknown): boolean {
  if (error instanceof LLMProviderError) {
    return error.retryable;
  }
  return false;
}
