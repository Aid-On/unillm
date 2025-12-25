/**
 * Memory optimization utilities for edge computing environments
 * 
 * Edge environments like Cloudflare Workers have strict memory limits.
 * These utilities help optimize memory usage when working with LLMs.
 */

import type { Credentials } from "./types.js";

// =============================================================================
// Message Optimization
// =============================================================================

export interface OptimizedMessage {
  role: "system" | "user" | "assistant";
  content: string;
  tokens?: number;
}

/**
 * Truncate message history to stay within token limits
 * Useful for edge environments with memory constraints
 * 
 * @example
 * ```typescript
 * const messages = [
 *   { role: "system", content: "You are a helpful assistant." },
 *   { role: "user", content: "Hello" },
 *   { role: "assistant", content: "Hi there!" },
 *   // ... many more messages
 * ];
 * 
 * // Keep only recent messages within token limit
 * const optimized = truncateMessages(messages, 2000);
 * ```
 */
export function truncateMessages(
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
  tokensPerChar = 0.25 // Rough estimation
): OptimizedMessage[] {
  let totalTokens = 0;

  // Always keep system message if it exists
  const systemMessage = messages.find(msg => msg.role === "system");
  const systemTokens = systemMessage 
    ? Math.ceil(systemMessage.content.length * tokensPerChar)
    : 0;
  totalTokens += systemTokens;

  // Add messages from newest to oldest until we hit token limit
  const otherMessages = messages
    .filter(msg => msg.role !== "system")
    .reverse(); // Start from newest

  const selectedOtherMessages: OptimizedMessage[] = [];
  for (const message of otherMessages) {
    const tokens = Math.ceil(message.content.length * tokensPerChar);
    
    if (totalTokens + tokens > maxTokens) {
      break;
    }

    selectedOtherMessages.unshift({ ...message, tokens } as OptimizedMessage);
    totalTokens += tokens;
  }

  // Combine system message (if exists) with selected other messages
  const result: OptimizedMessage[] = [];
  if (systemMessage) {
    result.push({ ...systemMessage, tokens: systemTokens } as OptimizedMessage);
  }
  result.push(...selectedOtherMessages);

  return result;
}

/**
 * Compress long messages by removing unnecessary whitespace and newlines
 */
export function compressMessage(content: string): string {
  return content
    .replace(/[ \t]+/g, " ") // Replace multiple spaces/tabs with single space
    .replace(/\n\s*\n/g, "\n") // Replace multiple newlines with single newline
    .replace(/\s+\n/g, "\n") // Remove trailing spaces before newlines
    .replace(/\n\s+/g, "\n") // Remove leading spaces after newlines
    .trim();
}

// =============================================================================
// Streaming Buffer Management
// =============================================================================

/**
 * Memory-efficient buffer for streaming responses
 * Automatically flushes when buffer gets too large
 */
export class StreamingBuffer {
  private buffer: string[] = [];
  private maxSize: number;
  private onFlush?: (content: string) => void;

  constructor(maxSize = 1024, onFlush?: (content: string) => void) {
    this.maxSize = maxSize;
    this.onFlush = onFlush;
  }

  append(chunk: string): void {
    this.buffer.push(chunk);
    
    if (this.getTotalLength() > this.maxSize) {
      this.flush();
    }
  }

  flush(): string {
    const content = this.buffer.join("");
    this.buffer = [];
    
    if (this.onFlush) {
      this.onFlush(content);
    }
    
    return content;
  }

  getContent(): string {
    return this.buffer.join("");
  }

  getTotalLength(): number {
    return this.buffer.reduce((sum, chunk) => sum + chunk.length, 0);
  }

  clear(): void {
    this.buffer = [];
  }
}

// =============================================================================
// Cache Utilities
// =============================================================================

/**
 * Simple LRU cache for edge environments
 * Useful for caching model responses or credentials
 */
export class EdgeCache<T> {
  private cache = new Map<string, { value: T; timestamp: number }>();
  private maxSize: number;
  private ttl: number; // Time to live in milliseconds

  constructor(maxSize = 100, ttl = 5 * 60 * 1000) { // Default 5 minutes
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    return entry.value;
  }

  set(key: string, value: T): void {
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }
}

// =============================================================================
// Memory Monitoring
// =============================================================================

/**
 * Get rough memory usage estimate
 * Note: This is a rough approximation as JS doesn't expose precise memory info
 */
export function getMemoryEstimate(): {
  heapUsed?: number;
  heapTotal?: number;
  external?: number;
} {
  // In Node.js environment
  if (typeof process !== "undefined" && process.memoryUsage) {
    const usage = process.memoryUsage();
    return {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
    };
  }

  // In browser/edge environments (limited info)
  if (typeof performance !== "undefined" && "memory" in performance) {
    const memory = (performance as any).memory;
    return {
      heapUsed: memory.usedJSHeapSize,
      heapTotal: memory.totalJSHeapSize,
    };
  }

  return {};
}

/**
 * Create a memory-aware credentials cache
 * Automatically cleans up when memory gets low
 */
export function createCredentialsCache(maxSize = 10, ttl = 10 * 60 * 1000): EdgeCache<Credentials> {
  const cache = new EdgeCache<Credentials>(maxSize, ttl);

  // Periodically cleanup expired entries
  if (typeof setInterval !== "undefined") {
    setInterval(() => {
      const removed = cache.cleanup();
      if (removed > 0) {
        console.debug(`Cleaned up ${removed} expired credential entries`);
      }
    }, ttl / 2);
  }

  return cache;
}