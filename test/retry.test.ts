import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  withRetry,
  withRetryResult,
  createRetryWrapper,
  calculateDelay,
  DEFAULT_RETRY_CONFIG,
} from "../src/retry.js";
import { LLMProviderError } from "../src/errors.js";

describe("calculateDelay", () => {
  it("should calculate exponential backoff", () => {
    // With fixed random (jitter = 1), delays should be:
    // attempt 0: 100 * 2^0 * 1 = 100
    // attempt 1: 100 * 2^1 * 1 = 200
    // attempt 2: 100 * 2^2 * 1 = 400
    vi.spyOn(Math, "random").mockReturnValue(0.5); // jitter = 1.0

    expect(calculateDelay(0, 100, 10000)).toBe(100);
    expect(calculateDelay(1, 100, 10000)).toBe(200);
    expect(calculateDelay(2, 100, 10000)).toBe(400);
  });

  it("should cap at maxDelay", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    // 100 * 2^10 * 1 = 102400, but capped at 1000
    expect(calculateDelay(10, 100, 1000)).toBe(1000);
  });

  it("should add jitter", () => {
    // With random = 0, jitter = 0.5
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(calculateDelay(0, 100, 10000)).toBe(50);

    // With random = 1, jitter = 1.5
    vi.spyOn(Math, "random").mockReturnValue(1);
    expect(calculateDelay(0, 100, 10000)).toBe(150);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
});

describe("withRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return result on success", async () => {
    const fn = vi.fn().mockResolvedValue("success");

    const resultPromise = withRetry(fn);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should retry on retryable error", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new LLMProviderError({ message: "Rate limit", code: "RATE_LIMIT" }))
      .mockResolvedValueOnce("success");

    const resultPromise = withRetry(fn, { maxRetries: 3, baseDelay: 10 });
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("should not retry on non-retryable error", async () => {
    const error = new LLMProviderError({ message: "Auth", code: "AUTH" });
    const fn = vi.fn().mockImplementation(() => Promise.reject(error));

    const resultPromise = withRetry(fn, { maxRetries: 3 });

    await vi.runAllTimersAsync();
    await expect(resultPromise).rejects.toThrow("Auth");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should throw after max retries", async () => {
    const error = new LLMProviderError({ message: "Rate limit", code: "RATE_LIMIT" });
    const fn = vi.fn().mockImplementation(() => Promise.reject(error));

    const resultPromise = withRetry(fn, { maxRetries: 2, baseDelay: 10 });

    await vi.runAllTimersAsync();
    await expect(resultPromise).rejects.toThrow("Rate limit");
    expect(fn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it("should call onRetry callback", async () => {
    const onRetry = vi.fn();
    const fn = vi.fn()
      .mockRejectedValueOnce(new LLMProviderError({ message: "Error", code: "RATE_LIMIT" }))
      .mockResolvedValueOnce("success");

    const resultPromise = withRetry(fn, { maxRetries: 3, baseDelay: 100, onRetry });
    await vi.runAllTimersAsync();
    await resultPromise;

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(LLMProviderError), expect.any(Number));
  });

  it("should respect retryOn filter", async () => {
    const error = new LLMProviderError({ message: "Timeout", code: "TIMEOUT" });
    const fn = vi.fn().mockImplementation(() => Promise.reject(error));

    // Only retry on RATE_LIMIT, not TIMEOUT
    const resultPromise = withRetry(fn, {
      maxRetries: 3,
      retryOn: ["RATE_LIMIT"],
      baseDelay: 10,
    });

    await vi.runAllTimersAsync();
    await expect(resultPromise).rejects.toThrow("Timeout");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should use custom delay function", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new LLMProviderError({ message: "Error", code: "RATE_LIMIT" }))
      .mockResolvedValueOnce("success");

    const delayFn = vi.fn().mockReturnValue(50);

    const resultPromise = withRetry(fn, { maxRetries: 3, delayFn });
    await vi.runAllTimersAsync();
    await resultPromise;

    expect(delayFn).toHaveBeenCalledWith(0, DEFAULT_RETRY_CONFIG.baseDelay);
  });

  it("should wrap non-LLMProviderError errors", async () => {
    const error = new Error("Network error ECONNREFUSED");
    const fn = vi.fn().mockImplementation(() => Promise.reject(error));

    const resultPromise = withRetry(fn, { maxRetries: 1, baseDelay: 10 });

    await vi.runAllTimersAsync();
    await expect(resultPromise).rejects.toMatchObject({
      code: "NETWORK",
    });
  });
});

describe("withRetryResult", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return metadata on success without retry", async () => {
    const fn = vi.fn().mockResolvedValue("success");

    const resultPromise = withRetryResult(fn);
    await vi.runAllTimersAsync();
    const { result, attempts, retried } = await resultPromise;

    expect(result).toBe("success");
    expect(attempts).toBe(1);
    expect(retried).toBe(false);
  });

  it("should return metadata with retry count", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new LLMProviderError({ message: "Error", code: "RATE_LIMIT" }))
      .mockRejectedValueOnce(new LLMProviderError({ message: "Error", code: "RATE_LIMIT" }))
      .mockResolvedValueOnce("success");

    const resultPromise = withRetryResult(fn, { maxRetries: 3, baseDelay: 10 });
    await vi.runAllTimersAsync();
    const { result, attempts, retried, totalTime } = await resultPromise;

    expect(result).toBe("success");
    expect(attempts).toBe(3);
    expect(retried).toBe(true);
    expect(totalTime).toBeGreaterThanOrEqual(0);
  });
});

describe("createRetryWrapper", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should create a wrapper with default config", async () => {
    const wrapper = createRetryWrapper({ maxRetries: 2, baseDelay: 10 });
    const fn = vi.fn()
      .mockRejectedValueOnce(new LLMProviderError({ message: "Error", code: "RATE_LIMIT" }))
      .mockResolvedValueOnce("success");

    const resultPromise = wrapper(fn);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("should allow config override", async () => {
    const wrapper = createRetryWrapper({ maxRetries: 5, baseDelay: 100 });
    const error = new LLMProviderError({ message: "Error", code: "RATE_LIMIT" });
    const fn = vi.fn().mockImplementation(() => Promise.reject(error));

    const resultPromise = wrapper(fn, { maxRetries: 0 }); // Override to no retries

    await vi.runAllTimersAsync();
    await expect(resultPromise).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
