import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  truncateMessages,
  compressMessage,
  StreamingBuffer,
  EdgeCache,
  getMemoryEstimate,
  createCredentialsCache,
} from "../src/memory.js";

describe("Memory optimization", () => {
  describe("truncateMessages", () => {
    it("should keep system message and truncate to token limit", () => {
      const messages = [
        { role: "system", content: "You are helpful." }, // ~4 tokens
        { role: "user", content: "Hello world" }, // ~3 tokens  
        { role: "assistant", content: "Hi there!" }, // ~3 tokens
        { role: "user", content: "How are you?" }, // ~4 tokens
        { role: "assistant", content: "I'm good, thanks for asking!" }, // ~8 tokens
      ];

      const result = truncateMessages(messages, 20); // Larger limit
      
      expect(result[0].role).toBe("system");
      expect(result.length).toBeGreaterThan(1);
      expect(result.length).toBeLessThanOrEqual(5);
      
      const totalTokens = result.reduce((sum, msg) => sum + (msg.tokens || 0), 0);
      expect(totalTokens).toBeLessThanOrEqual(20);
    });

    it("should handle messages without system message", () => {
      const messages = [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi" },
        { role: "user", content: "Bye" },
      ];

      const result = truncateMessages(messages, 5);
      
      expect(result.every(msg => msg.role !== "system")).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it("should prioritize recent messages", () => {
      const messages = [
        { role: "user", content: "Old message" },
        { role: "assistant", content: "Old response" },
        { role: "user", content: "New message" },
        { role: "assistant", content: "New response" },
      ];

      const result = truncateMessages(messages, 5);
      
      // Should contain newer messages
      expect(result.some(msg => msg.content.includes("New"))).toBe(true);
    });
  });

  describe("compressMessage", () => {
    it("should compress whitespace", () => {
      const input = "Hello    world\n\n\nHow are you?   \n  Fine!";
      const expected = "Hello world\nHow are you?\nFine!";
      
      expect(compressMessage(input)).toBe(expected);
    });

    it("should trim leading and trailing whitespace", () => {
      const input = "   Hello world   ";
      const expected = "Hello world";
      
      expect(compressMessage(input)).toBe(expected);
    });

    it("should handle empty strings", () => {
      expect(compressMessage("")).toBe("");
      expect(compressMessage("   ")).toBe("");
    });
  });

  describe("StreamingBuffer", () => {
    let buffer: StreamingBuffer;
    let flushCallback: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      flushCallback = vi.fn();
      buffer = new StreamingBuffer(20, flushCallback); // Larger buffer
    });

    it("should accumulate chunks", () => {
      buffer.append("Hello");
      buffer.append(" ");
      buffer.append("world");

      expect(buffer.getContent()).toBe("Hello world");
      expect(buffer.getTotalLength()).toBe(11);
    });

    it("should auto-flush when buffer gets too large", () => {
      buffer.append("12345678901234567890"); // Exactly at limit
      expect(flushCallback).not.toHaveBeenCalled();
      
      buffer.append("X"); // Exceeds limit
      expect(flushCallback).toHaveBeenCalledWith("12345678901234567890X");
      expect(buffer.getContent()).toBe("");
    });

    it("should manually flush", () => {
      buffer.append("Hello");
      const content = buffer.flush();

      expect(content).toBe("Hello");
      expect(flushCallback).toHaveBeenCalledWith("Hello");
      expect(buffer.getContent()).toBe("");
    });

    it("should clear buffer", () => {
      buffer.append("Hello");
      buffer.clear();

      expect(buffer.getContent()).toBe("");
      expect(buffer.getTotalLength()).toBe(0);
    });
  });

  describe("EdgeCache", () => {
    let cache: EdgeCache<string>;

    beforeEach(() => {
      cache = new EdgeCache<string>(3, 100); // 3 items, 100ms TTL
    });

    it("should store and retrieve values", () => {
      cache.set("key1", "value1");
      expect(cache.get("key1")).toBe("value1");
    });

    it("should return undefined for non-existent keys", () => {
      expect(cache.get("nonexistent")).toBeUndefined();
    });

    it("should expire entries after TTL", async () => {
      cache.set("key1", "value1");
      expect(cache.get("key1")).toBe("value1");

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(cache.get("key1")).toBeUndefined();
    });

    it("should evict oldest entries when at capacity", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.set("key3", "value3");
      cache.set("key4", "value4"); // Should evict key1

      expect(cache.get("key1")).toBeUndefined();
      expect(cache.get("key2")).toBe("value2");
      expect(cache.get("key3")).toBe("value3");
      expect(cache.get("key4")).toBe("value4");
    });

    it("should implement LRU behavior", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.set("key3", "value3");
      
      // Access key1 to make it recently used
      cache.get("key1");
      
      cache.set("key4", "value4"); // Should evict key2 (least recently used)

      expect(cache.get("key1")).toBe("value1");
      expect(cache.get("key2")).toBeUndefined();
      expect(cache.get("key3")).toBe("value3");
      expect(cache.get("key4")).toBe("value4");
    });

    it("should cleanup expired entries", async () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      const removed = cache.cleanup();
      expect(removed).toBe(2);
      expect(cache.size()).toBe(0);
    });

    it("should check if key exists", () => {
      cache.set("key1", "value1");
      expect(cache.has("key1")).toBe(true);
      expect(cache.has("key2")).toBe(false);
    });

    it("should delete entries", () => {
      cache.set("key1", "value1");
      expect(cache.delete("key1")).toBe(true);
      expect(cache.get("key1")).toBeUndefined();
      expect(cache.delete("key1")).toBe(false);
    });

    it("should clear all entries", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.clear();
      expect(cache.size()).toBe(0);
    });
  });

  describe("getMemoryEstimate", () => {
    it("should return memory information when available", () => {
      const estimate = getMemoryEstimate();
      expect(typeof estimate).toBe("object");
      
      // In test environment, may or may not have memory info
      if (estimate.heapUsed !== undefined) {
        expect(typeof estimate.heapUsed).toBe("number");
        expect(estimate.heapUsed).toBeGreaterThan(0);
      }
    });
  });

  describe("createCredentialsCache", () => {
    it("should create a cache for credentials", () => {
      const cache = createCredentialsCache(5, 1000);
      
      const credentials = {
        groqApiKey: "test-key",
      };

      cache.set("test", credentials);
      expect(cache.get("test")).toEqual(credentials);
      expect(cache.has("test")).toBe(true);
    });
  });
});