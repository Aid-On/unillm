/**
 * Gemini Model Definitions
 *
 * Google Gemini model metadata for all supported versions.
 */

import type { ModelInfo } from "./types.js";

/**
 * Gemini models (verified 2025-01-15)
 */
export const GEMINI_MODELS: ModelInfo[] = [
  // Gemini 3 Series (Latest)
  {
    spec: "gemini:gemini-3-pro-preview",
    provider: "gemini",
    model: "gemini-3-pro-preview",
    name: "Gemini 3 Pro (Preview)",
    contextWindow: 1048576,
    speed: "slow",
    cost: "high",
  },
  {
    spec: "gemini:gemini-3-flash-preview",
    provider: "gemini",
    model: "gemini-3-flash-preview",
    name: "Gemini 3 Flash (Preview)",
    contextWindow: 1048576,
    speed: "fast",
    cost: "medium",
  },

  // Gemini 2.5 Series
  {
    spec: "gemini:gemini-2.5-pro",
    provider: "gemini",
    model: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    contextWindow: 1048576,
    speed: "slow",
    cost: "high",
  },
  {
    spec: "gemini:gemini-2.5-flash",
    provider: "gemini",
    model: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    contextWindow: 1048576,
    speed: "fast",
    cost: "medium",
  },

  // Gemini 2.0 Series
  {
    spec: "gemini:gemini-2.0-flash",
    provider: "gemini",
    model: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    contextWindow: 1048576,
    speed: "fast",
    cost: "low",
  },
  {
    spec: "gemini:gemini-2.0-flash-lite",
    provider: "gemini",
    model: "gemini-2.0-flash-lite",
    name: "Gemini 2.0 Flash Lite",
    contextWindow: 1048576,
    speed: "fast",
    cost: "low",
  },

  // Gemini 1.5 Series (Legacy but Active)
  {
    spec: "gemini:gemini-1.5-pro-002",
    provider: "gemini",
    model: "gemini-1.5-pro-002",
    name: "Gemini 1.5 Pro",
    contextWindow: 1048576,
    speed: "medium",
    cost: "medium",
  },
  {
    spec: "gemini:gemini-1.5-flash-002",
    provider: "gemini",
    model: "gemini-1.5-flash-002",
    name: "Gemini 1.5 Flash",
    contextWindow: 1048576,
    speed: "fast",
    cost: "low",
  },
];
