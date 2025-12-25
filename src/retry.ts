/**
 * Retry Logic for LLM Provider
 *
 * Exponential backoff with jitter for handling transient errors
 */

import {
  LLMProviderError,
  LLMErrorCode,
  wrapError,
} from "./errors.js";

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay in milliseconds (default: 100) */
  baseDelay?: number;
  /** Maximum delay in milliseconds (default: 10000) */
  maxDelay?: number;
  /** Error codes to retry on (default: all retryable codes) */
  retryOn?: LLMErrorCode[];
  /** Callback when a retry occurs */
  onRetry?: (attempt: number, error: LLMProviderError, delay: number) => void;
  /** Custom delay calculator (overrides exponential backoff) */
  delayFn?: (attempt: number, baseDelay: number) => number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: Required<Omit<RetryConfig, "onRetry" | "delayFn" | "retryOn">> = {
  maxRetries: 3,
  baseDelay: 100,
  maxDelay: 10000,
};

/**
 * Default retryable error codes
 */
export const DEFAULT_RETRYABLE_CODES: LLMErrorCode[] = [
  "RATE_LIMIT",
  "TIMEOUT",
  "NETWORK",
  "SERVER_ERROR",
];

/**
 * Calculate delay with exponential backoff and jitter
 *
 * @param attempt - Current attempt number (0-indexed)
 * @param baseDelay - Base delay in milliseconds
 * @param maxDelay - Maximum delay cap
 * @returns Delay in milliseconds
 */
export function calculateDelay(
  attempt: number,
  baseDelay: number,
  maxDelay: number
): number {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = baseDelay * Math.pow(2, attempt);

  // Add jitter (random factor between 0.5 and 1.5)
  const jitter = 0.5 + Math.random();
  const delayWithJitter = exponentialDelay * jitter;

  // Cap at maxDelay
  return Math.min(delayWithJitter, maxDelay);
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   () => generateText({ model, prompt }),
 *   {
 *     maxRetries: 3,
 *     baseDelay: 100,
 *     retryOn: ['RATE_LIMIT', 'TIMEOUT'],
 *     onRetry: (attempt, error) => console.log(`Retry ${attempt}...`),
 *   }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const {
    maxRetries = DEFAULT_RETRY_CONFIG.maxRetries,
    baseDelay = DEFAULT_RETRY_CONFIG.baseDelay,
    maxDelay = DEFAULT_RETRY_CONFIG.maxDelay,
    retryOn,
    onRetry,
    delayFn,
  } = config;

  // Determine which codes to retry on
  const retryableCodes = retryOn ?? DEFAULT_RETRYABLE_CODES;

  let lastError: LLMProviderError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      // Wrap error for consistent handling
      const wrappedError = wrapError(error);
      lastError = wrappedError;

      // Check if we should retry
      const isLastAttempt = attempt === maxRetries;
      const shouldRetry =
        !isLastAttempt && retryableCodes.includes(wrappedError.code);

      if (!shouldRetry) {
        throw wrappedError;
      }

      // Calculate delay
      const delay = delayFn
        ? delayFn(attempt, baseDelay)
        : calculateDelay(attempt, baseDelay, maxDelay);

      // Notify callback
      if (onRetry) {
        onRetry(attempt + 1, wrappedError, delay);
      }

      // Wait before next attempt
      await sleep(delay);
    }
  }

  // Should never reach here, but TypeScript needs this
  throw lastError ?? new Error("Retry failed");
}

/**
 * Result of withRetryResult - includes metadata about retries
 */
export interface RetryResult<T> {
  /** The successful result */
  result: T;
  /** Number of attempts made */
  attempts: number;
  /** Total time spent including retries (ms) */
  totalTime: number;
  /** Whether any retries occurred */
  retried: boolean;
}

/**
 * Execute a function with retry logic, returning metadata about the retries
 *
 * @example
 * ```typescript
 * const { result, attempts, totalTime } = await withRetryResult(
 *   () => generateText({ model, prompt }),
 *   { maxRetries: 3 }
 * );
 * console.log(`Success after ${attempts} attempts in ${totalTime}ms`);
 * ```
 */
export async function withRetryResult<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<RetryResult<T>> {
  const startTime = Date.now();
  let attempts = 0;

  const result = await withRetry(async () => {
    attempts++;
    return fn();
  }, config);

  return {
    result,
    attempts,
    totalTime: Date.now() - startTime,
    retried: attempts > 1,
  };
}

/**
 * Create a retry wrapper with pre-configured options
 *
 * @example
 * ```typescript
 * const retryWithBackoff = createRetryWrapper({
 *   maxRetries: 5,
 *   baseDelay: 200,
 *   onRetry: (attempt) => console.log(`Retry ${attempt}...`),
 * });
 *
 * // Use later
 * const result = await retryWithBackoff(() => generateText({ model, prompt }));
 * ```
 */
export function createRetryWrapper(defaultConfig: RetryConfig) {
  return async function <T>(
    fn: () => Promise<T>,
    overrideConfig?: RetryConfig
  ): Promise<T> {
    return withRetry(fn, { ...defaultConfig, ...overrideConfig });
  };
}
