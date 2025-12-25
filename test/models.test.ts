import { describe, it, expect } from "vitest";
import {
  MODELS,
  MODEL_BY_SPEC,
  getModelInfo,
  getModelsByProvider,
  getAllSpecs,
  getRecommendedModels,
  DEFAULT_SPECS,
  isValidSpec,
} from "../src/models.js";

describe("MODELS", () => {
  it("should have models from all providers", () => {
    const groqModels = MODELS.filter((m) => m.provider === "groq");
    const geminiModels = MODELS.filter((m) => m.provider === "gemini");
    const cloudflareModels = MODELS.filter((m) => m.provider === "cloudflare");

    expect(groqModels.length).toBeGreaterThan(0);
    expect(geminiModels.length).toBeGreaterThan(0);
    expect(cloudflareModels.length).toBeGreaterThan(0);
  });

  it("should have required fields for each model", () => {
    for (const model of MODELS) {
      expect(model.spec).toBeDefined();
      expect(model.provider).toBeDefined();
      expect(model.model).toBeDefined();
      expect(model.name).toBeDefined();
      expect(model.contextWindow).toBeGreaterThan(0);
      expect(["fast", "medium", "slow"]).toContain(model.speed);
      expect(["free", "low", "medium", "high"]).toContain(model.cost);
    }
  });

  it("should have spec in provider:model format", () => {
    for (const model of MODELS) {
      expect(model.spec).toBe(`${model.provider}:${model.model}`);
    }
  });
});

describe("MODEL_BY_SPEC", () => {
  it("should have all models indexed by spec", () => {
    expect(Object.keys(MODEL_BY_SPEC).length).toBe(MODELS.length);
  });

  it("should return correct model for spec", () => {
    const model = MODEL_BY_SPEC["groq:llama-3.1-8b-instant"];
    expect(model).toBeDefined();
    expect(model.name).toBe("Llama 3.1 8B Instant");
  });
});

describe("getModelInfo", () => {
  it("should return model info by spec", () => {
    const info = getModelInfo("groq:llama-3.1-8b-instant");
    expect(info).toBeDefined();
    expect(info?.name).toBe("Llama 3.1 8B Instant");
    expect(info?.provider).toBe("groq");
    expect(info?.model).toBe("llama-3.1-8b-instant");
  });

  it("should return undefined for unknown spec", () => {
    const info = getModelInfo("unknown:model");
    expect(info).toBeUndefined();
  });
});

describe("getModelsByProvider", () => {
  it("should return only groq models", () => {
    const models = getModelsByProvider("groq");
    expect(models.length).toBeGreaterThan(0);
    expect(models.every((m) => m.provider === "groq")).toBe(true);
  });

  it("should return only gemini models", () => {
    const models = getModelsByProvider("gemini");
    expect(models.length).toBeGreaterThan(0);
    expect(models.every((m) => m.provider === "gemini")).toBe(true);
  });

  it("should return only cloudflare models", () => {
    const models = getModelsByProvider("cloudflare");
    expect(models.length).toBeGreaterThan(0);
    expect(models.every((m) => m.provider === "cloudflare")).toBe(true);
  });
});

describe("getAllSpecs", () => {
  it("should return all model specs", () => {
    const specs = getAllSpecs();
    expect(specs.length).toBe(MODELS.length);
    expect(specs).toContain("groq:llama-3.1-8b-instant");
    expect(specs).toContain("gemini:gemini-2.0-flash");
  });
});

describe("getRecommendedModels", () => {
  it("should return only fast and low/free cost models", () => {
    const recommended = getRecommendedModels();
    expect(recommended.length).toBeGreaterThan(0);

    for (const model of recommended) {
      expect(model.speed).toBe("fast");
      expect(["free", "low"]).toContain(model.cost);
    }
  });
});

describe("DEFAULT_SPECS", () => {
  it("should have defaults for all providers", () => {
    expect(DEFAULT_SPECS.groq).toBe("groq:llama-3.1-8b-instant");
    expect(DEFAULT_SPECS.gemini).toBe("gemini:gemini-2.0-flash");
    expect(DEFAULT_SPECS.cloudflare).toBe("cloudflare:@cf/meta/llama-3.3-70b-instruct-fp8-fast");
  });

  it("should reference valid specs", () => {
    expect(getModelInfo(DEFAULT_SPECS.groq)).toBeDefined();
    expect(getModelInfo(DEFAULT_SPECS.gemini)).toBeDefined();
    expect(getModelInfo(DEFAULT_SPECS.cloudflare)).toBeDefined();
  });
});

describe("isValidSpec", () => {
  it("should return true for valid specs", () => {
    expect(isValidSpec("groq:llama-3.1-8b-instant")).toBe(true);
    expect(isValidSpec("gemini:gemini-2.0-flash")).toBe(true);
    expect(isValidSpec("cloudflare:@cf/meta/llama-3.3-70b-instruct-fp8-fast")).toBe(true);
  });

  it("should return false for invalid specs", () => {
    expect(isValidSpec("unknown:model")).toBe(false);
    expect(isValidSpec("groq:unknown-model")).toBe(false);
    expect(isValidSpec("invalid")).toBe(false);
  });
});
