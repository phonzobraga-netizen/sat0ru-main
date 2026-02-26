import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, "..", "..");
const workspaceRoot = path.resolve(repoRoot, "..");

function parseEnvValue(rawValue) {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return "";
  }

  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  const commentIndex = trimmed.indexOf(" #");
  if (commentIndex >= 0) {
    return trimmed.slice(0, commentIndex).trim();
  }
  return trimmed;
}

export function parseDotEnv(text) {
  const result = {};
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator < 1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    if (!key) {
      continue;
    }

    const value = parseEnvValue(trimmed.slice(separator + 1));
    result[key] = value;
  }

  return result;
}

export function readDotEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return parseDotEnv(fs.readFileSync(filePath, "utf8"));
}

function normalizeModelList(raw) {
  if (!raw) {
    return [];
  }

  return Array.from(
    new Set(
      raw
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

export function buildGeminiModelChain(config) {
  return Array.from(
    new Set([config.primaryModel, ...config.fallbackModels].map((model) => model.trim()).filter(Boolean)),
  );
}

export function resolveGeminiConfig(env = process.env) {
  const candidateEnvFiles = [
    path.resolve(workspaceRoot, "fairdev", "apps", "api", ".env.example"),
    path.resolve(workspaceRoot, "fairdev", "apps", "api", ".env.local"),
    path.resolve(workspaceRoot, "fairdev", "apps", "api", ".env"),
    path.resolve(repoRoot, ".env"),
    path.resolve(repoRoot, "ml", ".env"),
  ];

  const loadedFrom = [];
  let fileEnv = {};

  for (const envFilePath of candidateEnvFiles) {
    const parsed = readDotEnvFile(envFilePath);
    if (parsed) {
      fileEnv = { ...fileEnv, ...parsed };
      loadedFrom.push(envFilePath);
    }
  }

  const apiKey = (env.GEMINI_API_KEY || fileEnv.GEMINI_API_KEY || "").trim();
  const primaryModel = (env.GEMINI_MODEL || fileEnv.GEMINI_MODEL || "gemini-2.0-flash").trim();
  const fallbackModels = normalizeModelList(
    env.GEMINI_FALLBACK_MODELS || fileEnv.GEMINI_FALLBACK_MODELS || "gemini-2.0-flash-lite",
  ).filter((model) => model !== primaryModel);

  return {
    apiKey,
    primaryModel,
    fallbackModels,
    loadedFrom,
    hasApiKey: Boolean(apiKey),
    repoRoot,
  };
}
