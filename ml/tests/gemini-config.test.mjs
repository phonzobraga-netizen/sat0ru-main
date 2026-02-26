import test from "node:test";
import assert from "node:assert/strict";
import { buildGeminiModelChain, parseDotEnv } from "../scripts/gemini-config.mjs";

test("parseDotEnv parses simple key-value pairs", () => {
  const parsed = parseDotEnv([
    "GEMINI_API_KEY=test-key",
    "GEMINI_MODEL=gemini-2.0-flash",
    "GEMINI_FALLBACK_MODELS=gemini-2.0-flash-lite, gemini-1.5-flash",
  ].join("\n"));

  assert.equal(parsed.GEMINI_API_KEY, "test-key");
  assert.equal(parsed.GEMINI_MODEL, "gemini-2.0-flash");
  assert.equal(parsed.GEMINI_FALLBACK_MODELS, "gemini-2.0-flash-lite, gemini-1.5-flash");
});

test("buildGeminiModelChain deduplicates configured models", () => {
  const chain = buildGeminiModelChain({
    primaryModel: "gemini-2.0-flash",
    fallbackModels: ["gemini-2.0-flash", "gemini-2.0-flash-lite"],
  });

  assert.deepEqual(chain, ["gemini-2.0-flash", "gemini-2.0-flash-lite"]);
});
