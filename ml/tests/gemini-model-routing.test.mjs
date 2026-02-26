import test from "node:test";
import assert from "node:assert/strict";
import { scoreGeminiModelName, selectRunnableModelChain } from "../scripts/backlog-autofix.mjs";

test("scoreGeminiModelName ranks pro above flash and flash above lite", () => {
  const pro = scoreGeminiModelName("gemini-2.5-pro");
  const flash = scoreGeminiModelName("gemini-2.0-flash");
  const lite = scoreGeminiModelName("gemini-2.0-flash-lite");

  assert.ok(pro > flash);
  assert.ok(flash > lite);
});

test("selectRunnableModelChain includes all discovered models in best-first order", () => {
  const configured = ["gemini-2.0-flash"];
  const supported = ["gemini-1.5-flash", "gemini-2.5-pro", "gemini-2.0-flash-lite"];
  const chain = selectRunnableModelChain(configured, supported);

  assert.equal(chain[0], "gemini-2.5-pro");
  assert.equal(chain.length, 4);
  assert.ok(chain.includes("gemini-2.0-flash"));
  assert.ok(chain.includes("gemini-1.5-flash"));
  assert.ok(chain.includes("gemini-2.0-flash-lite"));
});
