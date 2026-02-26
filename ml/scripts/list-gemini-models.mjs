import { buildGeminiModelChain, resolveGeminiConfig } from "./gemini-config.mjs";
import { fetchSupportedGeminiModels, scoreGeminiModelName, selectRunnableModelChain } from "./backlog-autofix.mjs";

async function run() {
  const config = resolveGeminiConfig();
  if (!config.hasApiKey) {
    throw new Error(
      "Gemini API key not found. Set GEMINI_API_KEY or provide it in fairdev/apps/api/.env (or SAT0RU-main/ml/.env).",
    );
  }

  const configured = buildGeminiModelChain(config);
  const supported = await fetchSupportedGeminiModels(config.apiKey);
  const ranked = selectRunnableModelChain(configured, supported);

  const output = {
    configuredModelChain: configured,
    supportedModelCount: supported.length,
    rankedModelCount: ranked.length,
    rankedModels: ranked.map((modelName) => ({
      modelName,
      score: scoreGeminiModelName(modelName),
    })),
    envSources: config.loadedFrom,
  };

  console.log(JSON.stringify(output, null, 2));
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
