import { describe, it, expect } from "vitest";
import {
  LLMProviderError,
  wrapError,
  isLLMError,
  isRetryable,
  isRetryableCode,
  statusToErrorCode,
} from "../src/errors.js";

describe("LLMProviderError", () => {
  it("should create error with all properties", () => {
    const error = new LLMProviderError({
      message: "Rate limit exceeded",
      code: "RATE_LIMIT",
      provider: "groq",
      statusCode: 429,
      retryable: true,
    });

    expect(error.message).toBe("Rate limit exceeded");
    expect(error.code).toBe("RATE_LIMIT");
    expect(error.provider).toBe("groq");
    expect(error.statusCode).toBe(429);
    expect(error.retryable).toBe(true);
    expect(error.name).toBe("LLMProviderError");
  });

  it("should auto-detect retryable status", () => {
    const retryableError = new LLMProviderError({
      message: "Rate limit",
      code: "RATE_LIMIT",
    });
    expect(retryableError.retryable).toBe(true);

    const nonRetryableError = new LLMProviderError({
      message: "Auth failed",
      code: "AUTH",
    });
    expect(nonRetryableError.retryable).toBe(false);
  });

  it("should generate user-friendly messages", () => {
    const rateLimitError = new LLMProviderError({
      message: "429",
      code: "RATE_LIMIT",
    });
    expect(rateLimitError.toUserMessage()).toContain("Too many requests");

    const authError = new LLMProviderError({
      message: "401",
      code: "AUTH",
    });
    expect(authError.toUserMessage()).toContain("Authentication failed");
  });

  it("should preserve cause error", () => {
    const cause = new Error("Original error");
    const error = new LLMProviderError({
      message: "Wrapped error",
      code: "UNKNOWN",
      cause,
    });
    expect(error.cause).toBe(cause);
  });
});

describe("wrapError", () => {
  it("should pass through LLMProviderError", () => {
    const original = new LLMProviderError({
      message: "Test",
      code: "AUTH",
    });
    const wrapped = wrapError(original);
    expect(wrapped).toBe(original);
  });

  it("should detect rate limit errors", () => {
    const error = new Error("Rate limit exceeded");
    const wrapped = wrapError(error, "groq");
    expect(wrapped.code).toBe("RATE_LIMIT");
    expect(wrapped.provider).toBe("groq");
  });

  it("should detect timeout errors", () => {
    const error = new Error("Request timed out");
    const wrapped = wrapError(error);
    expect(wrapped.code).toBe("TIMEOUT");
  });

  it("should detect authentication errors", () => {
    const error = new Error("Invalid API key");
    const wrapped = wrapError(error);
    expect(wrapped.code).toBe("AUTH");
  });

  it("should detect network errors", () => {
    const error = new Error("ECONNREFUSED");
    const wrapped = wrapError(error);
    expect(wrapped.code).toBe("NETWORK");
  });

  it("should handle non-Error objects", () => {
    const wrapped = wrapError("String error", "gemini");
    expect(wrapped.message).toContain("String error");
    expect(wrapped.code).toBe("UNKNOWN");
    expect(wrapped.provider).toBe("gemini");
  });

  it("should add context to message", () => {
    const error = new Error("Original");
    const wrapped = wrapError(error, "groq", "API call");
    expect(wrapped.message).toBe("API call: Original");
  });
});

describe("isLLMError", () => {
  it("should return true for LLMProviderError", () => {
    const error = new LLMProviderError({
      message: "Test",
      code: "AUTH",
    });
    expect(isLLMError(error)).toBe(true);
  });

  it("should return false for regular Error", () => {
    const error = new Error("Test");
    expect(isLLMError(error)).toBe(false);
  });

  it("should check specific error code", () => {
    const error = new LLMProviderError({
      message: "Test",
      code: "RATE_LIMIT",
    });
    expect(isLLMError(error, "RATE_LIMIT")).toBe(true);
    expect(isLLMError(error, "AUTH")).toBe(false);
  });
});

describe("isRetryable", () => {
  it("should return true for retryable errors", () => {
    const error = new LLMProviderError({
      message: "Test",
      code: "RATE_LIMIT",
    });
    expect(isRetryable(error)).toBe(true);
  });

  it("should return false for non-retryable errors", () => {
    const error = new LLMProviderError({
      message: "Test",
      code: "AUTH",
    });
    expect(isRetryable(error)).toBe(false);
  });

  it("should return false for non-LLMProviderError", () => {
    const error = new Error("Test");
    expect(isRetryable(error)).toBe(false);
  });
});

describe("isRetryableCode", () => {
  it("should return true for retryable codes", () => {
    expect(isRetryableCode("RATE_LIMIT")).toBe(true);
    expect(isRetryableCode("TIMEOUT")).toBe(true);
    expect(isRetryableCode("NETWORK")).toBe(true);
    expect(isRetryableCode("SERVER_ERROR")).toBe(true);
  });

  it("should return false for non-retryable codes", () => {
    expect(isRetryableCode("AUTH")).toBe(false);
    expect(isRetryableCode("INVALID_RESPONSE")).toBe(false);
    expect(isRetryableCode("VALIDATION")).toBe(false);
    expect(isRetryableCode("UNKNOWN")).toBe(false);
  });
});

describe("statusToErrorCode", () => {
  it("should map HTTP status codes correctly", () => {
    expect(statusToErrorCode(429)).toBe("RATE_LIMIT");
    expect(statusToErrorCode(401)).toBe("AUTH");
    expect(statusToErrorCode(403)).toBe("AUTH");
    expect(statusToErrorCode(408)).toBe("TIMEOUT");
    expect(statusToErrorCode(500)).toBe("SERVER_ERROR");
    expect(statusToErrorCode(503)).toBe("SERVER_ERROR");
    expect(statusToErrorCode(400)).toBe("UNKNOWN");
  });
});
