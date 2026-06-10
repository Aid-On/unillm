/**
 * Gemini Model Definitions
 *
 * Google Gemini model metadata for all supported versions.
 */

import type { ModelInfo } from "./types.js";

/**
 * Gemini models (verified 2026-06-10)
 *
 * 2.0 系・1.5 系は Google 側で廃止済み（404）のためカタログから削除。
 * text-smash の 2026-06-02 インシデント（gemini-2.0-flash 廃止で OCR 全滅）の再発防止。
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

  {
    spec: "gemini:gemini-2.5-flash-lite",
    provider: "gemini",
    model: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    contextWindow: 1048576,
    speed: "fast",
    cost: "low",
  },
];
