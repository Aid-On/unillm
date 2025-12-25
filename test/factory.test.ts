import { describe, it, expect, vi, afterEach } from "vitest";
import {
  parseModelSpec,
  createModelSpec,
  generate,
  generateWithGroq,
  generateWithGemini,
  hasCredentials,
  getCredentialsFromEnv,
} from "../src/factory.js";
import type { Credentials } from "../src/types.js";

describe("parseModelSpec", () => {
  it("should parse valid model spec", () => {
    const result = parseModelSpec("groq:llama-3.1-8b-instant");
    expect(result).toEqual({
      provider: "groq",
      model: "llama-3.1-8b-instant",
      spec: "groq:llama-3.1-8b-instant",
    });
  });

  it("should throw for invalid spec format", () => {
    expect(() => parseModelSpec("invalid-spec")).toThrow(
      'Invalid ModelSpec: "invalid-spec". Expected format: "provider:model"'
    );
  });

  it("should throw for unknown provider", () => {
    expect(() => parseModelSpec("unknown:model")).toThrow(
      'Unknown provider: "unknown". Expected: groq, gemini, or cloudflare'
    );
  });

  it("should throw for empty model", () => {
    expect(() => parseModelSpec("groq:")).toThrow(
      'Model ID is required in spec: "groq:"'
    );
  });
});

describe("createModelSpec", () => {
  it("should create model spec string", () => {
    expect(createModelSpec("groq", "llama-3.1-8b-instant")).toBe("groq:llama-3.1-8b-instant");
    expect(createModelSpec("gemini", "gemini-2.0-flash")).toBe("gemini:gemini-2.0-flash");
  });
});

describe("generate (edge-native)", () => {
  // Mock fetch for these tests
  const mockFetch = vi.fn();
  global.fetch = mockFetch;

  afterEach(() => {
    mockFetch.mockReset();
  });

  it("should throw for missing groq credentials", async () => {
    await expect(
      generate("groq:llama-3.1-8b-instant", [], {})
    ).rejects.toThrow("groqApiKey is required");
  });

  it("should throw for missing gemini credentials", async () => {
    await expect(
      generate("gemini:gemini-2.0-flash", [], {})
    ).rejects.toThrow("geminiApiKey is required");
  });

  it("should throw for missing cloudflare credentials", async () => {
    await expect(
      generate("cloudflare:@cf/meta/llama-3.3-70b-instruct-fp8-fast", [], {})
    ).rejects.toThrow("Cloudflare models require cloudflareApiKey");
  });
});

describe("hasCredentials", () => {
  it("should return true when groq api key is set", () => {
    expect(hasCredentials("groq", { groqApiKey: "key" })).toBe(true);
  });

  it("should return false when groq api key is missing", () => {
    expect(hasCredentials("groq", {})).toBe(false);
  });

  it("should return true when gemini api key is set", () => {
    expect(hasCredentials("gemini", { geminiApiKey: "key" })).toBe(true);
  });

  it("should return false when gemini api key is missing", () => {
    expect(hasCredentials("gemini", {})).toBe(false);
  });

  it("should return true when cloudflare credentials are complete", () => {
    expect(
      hasCredentials("cloudflare", {
        cloudflareApiKey: "key",
        cloudflareEmail: "email",
        cloudflareAccountId: "id",
      })
    ).toBe(true);
  });

  it("should return false when cloudflare credentials are incomplete", () => {
    expect(hasCredentials("cloudflare", { cloudflareApiKey: "key" })).toBe(false);
  });
});

describe("getCredentialsFromEnv", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should read credentials from environment variables", () => {
    process.env = {
      ...originalEnv,
      GROQ_API_KEY: "groq-key",
      GEMINI_API_KEY: "gemini-key",
      CLOUDFLARE_API_KEY: "cf-key",
      CLOUDFLARE_EMAIL: "cf-email",
      CLOUDFLARE_ACCOUNT_ID: "cf-id",
    };

    const creds = getCredentialsFromEnv();
    expect(creds).toEqual({
      groqApiKey: "groq-key",
      geminiApiKey: "gemini-key",
      cloudflareApiKey: "cf-key",
      cloudflareEmail: "cf-email",
      cloudflareAccountId: "cf-id",
    });
  });

  it("should handle missing environment variables", () => {
    process.env = { ...originalEnv };
    delete process.env.GROQ_API_KEY;
    delete process.env.GEMINI_API_KEY;

    const creds = getCredentialsFromEnv();
    expect(creds.groqApiKey).toBeUndefined();
    expect(creds.geminiApiKey).toBeUndefined();
  });
});