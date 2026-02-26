import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildGeminiModelChain, resolveGeminiConfig } from "./gemini-config.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

function normalizeModelName(modelName) {
  return String(modelName || "").replace(/^models\//i, "").trim();
}

export function scoreGeminiModelName(modelName) {
  const name = normalizeModelName(modelName).toLowerCase();
  let score = 0;

  if (name.includes("gemini-2.5-pro")) score += 12000;
  else if (name.includes("gemini-2.5-flash")) score += 11000;
  else if (name.includes("gemini-2.0-pro")) score += 10000;
  else if (name.includes("gemini-2.0-flash")) score += 9000;
  else if (name.includes("gemini-1.5-pro")) score += 7000;
  else if (name.includes("gemini-1.5-flash")) score += 6500;
  else score += 5000;

  if (name.includes("pro")) score += 600;
  if (name.includes("flash")) score += 400;
  if (name.includes("thinking")) score += 250;
  if (name.includes("lite")) score -= 300;
  if (name.includes("8b")) score -= 200;
  if (name.includes("experimental") || name.includes("preview") || name.includes("-exp")) score -= 800;

  return score;
}

function clampScore(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

export async function fetchSupportedGeminiModels(apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to fetch Gemini model list (${response.status}): ${trimLargeText(body, 1200)}`);
  }

  const data = await response.json();
  const models = Array.isArray(data?.models) ? data.models : [];

  return models
    .filter((entry) =>
      Array.isArray(entry.supportedGenerationMethods) && entry.supportedGenerationMethods.includes("generateContent"),
    )
    .map((entry) => normalizeModelName(entry.name))
    .filter((name) => name.toLowerCase().startsWith("gemini"))
    .filter(Boolean);
}

export function selectRunnableModelChain(configuredChain, supportedModels) {
  const normalizedConfigured = Array.from(new Set(configuredChain.map((name) => normalizeModelName(name)).filter(Boolean)));
  const normalizedSupported = Array.from(new Set(supportedModels.map((name) => normalizeModelName(name)).filter(Boolean)));

  const baseModels = normalizedSupported.length > 0 ? normalizedSupported : normalizedConfigured;
  const missingConfigured = normalizedConfigured.filter((name) => !baseModels.includes(name));
  const ranked = [...baseModels].sort((a, b) => {
    const scoreDiff = scoreGeminiModelName(b) - scoreGeminiModelName(a);
    if (scoreDiff !== 0) {
      return scoreDiff;
    }
    return a.localeCompare(b);
  });

  return [...ranked, ...missingConfigured];
}

function warmLoadGeminiModels(client, modelChain) {
  const loaded = [];
  const failed = [];

  for (const modelName of modelChain) {
    try {
      client.getGenerativeModel({ model: modelName });
      loaded.push(modelName);
    } catch (error) {
      failed.push({
        modelName,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { loaded, failed };
}

function classifyGeminiError(error) {
  const status = typeof error?.status === "number" ? error.status : null;
  const message = String(error?.message || "").toLowerCase();

  if (
    status === 429 ||
    message.includes("quota exceeded") ||
    message.includes("too many requests") ||
    message.includes("rate limit")
  ) {
    return "rate_limited";
  }

  if (
    status === 404 ||
    status === 400 ||
    message.includes("not found") ||
    message.includes("not supported")
  ) {
    return "unavailable";
  }

  return "other";
}

async function resolveActiveModelChain(apiKey, configuredChain) {
  try {
    const supported = await fetchSupportedGeminiModels(apiKey);
    const modelChain = selectRunnableModelChain(configuredChain, supported);
    return {
      modelChain,
      configuredModelChain: configuredChain.map((name) => normalizeModelName(name)),
      supportedModels: supported,
      warning: null,
    };
  } catch (error) {
    return {
      modelChain: configuredChain.map((name) => normalizeModelName(name)).filter(Boolean),
      configuredModelChain: configuredChain.map((name) => normalizeModelName(name)),
      supportedModels: [],
      warning: error instanceof Error ? error.message : String(error),
    };
  }
}

function trimLargeText(value, maxChars = 7000) {
  if (typeof value !== "string") {
    return "";
  }

  if (value.length <= maxChars) {
    return value;
  }

  return `${value.slice(0, maxChars)}\n...<truncated>`;
}

function parseGeminiJson(rawText) {
  const cleaned = String(rawText || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");
  if (jsonStart < 0 || jsonEnd < jsonStart) {
    throw new Error("Gemini did not return JSON.");
  }

  return JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
}

function safeResolveFile(targetPath) {
  const absolute = path.resolve(repoRoot, targetPath);
  const relative = path.relative(repoRoot, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to edit path outside SAT0RU repo: ${targetPath}`);
  }
  return absolute;
}

function readBacklogPayload(backlogPath) {
  const payload = JSON.parse(fs.readFileSync(backlogPath, "utf8"));

  if (Array.isArray(payload)) {
    return { items: payload };
  }

  if (Array.isArray(payload.items)) {
    return payload;
  }

  throw new Error("Backlog payload must be an array or object with an `items` array.");
}

function parseArgs(argv) {
  const options = {
    backlogPath: path.resolve(repoRoot, "ml", "backlog", "backlog.json"),
    maxIterations: 5,
    targetScore: 100,
    writeChanges: true,
    reportPath: path.resolve(repoRoot, "ml", "reports", "backlog-autofix-report.json"),
    globalValidationCommand: "",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--backlog" && argv[i + 1]) {
      options.backlogPath = path.resolve(process.cwd(), argv[i + 1]);
      i += 1;
      continue;
    }
    if (arg === "--max-iterations" && argv[i + 1]) {
      options.maxIterations = Math.max(1, Number.parseInt(argv[i + 1], 10) || options.maxIterations);
      i += 1;
      continue;
    }
    if (arg === "--target-score" && argv[i + 1]) {
      options.targetScore = clampScore(Number.parseInt(argv[i + 1], 10));
      i += 1;
      continue;
    }
    if (arg === "--validation" && argv[i + 1]) {
      options.globalValidationCommand = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--dry-run" || arg === "--no-write") {
      options.writeChanges = false;
      continue;
    }
    if (arg === "--report" && argv[i + 1]) {
      options.reportPath = path.resolve(process.cwd(), argv[i + 1]);
      i += 1;
      continue;
    }
  }

  return options;
}

function runValidationCommand(command) {
  if (!command || !command.trim()) {
    return { ok: true, output: "Validation command not provided.", exitCode: 0 };
  }

  try {
    const output = execSync(command, {
      cwd: repoRoot,
      stdio: "pipe",
      encoding: "utf8",
      maxBuffer: 2 * 1024 * 1024,
    });

    return {
      ok: true,
      exitCode: 0,
      output: trimLargeText(output),
    };
  } catch (error) {
    const stdout = error?.stdout ? String(error.stdout) : "";
    const stderr = error?.stderr ? String(error.stderr) : "";
    return {
      ok: false,
      exitCode: typeof error?.status === "number" ? error.status : 1,
      output: trimLargeText(`${stdout}\n${stderr}`.trim()),
    };
  }
}

function normalizeGeminiResult(raw) {
  const issues = Array.isArray(raw?.issues) ? raw.issues.map(String) : [];
  const updatedFileContent = typeof raw?.updatedFileContent === "string" ? raw.updatedFileContent : null;
  const correctnessScore = clampScore(Number(raw?.correctnessScore));
  const changeSummary = typeof raw?.changeSummary === "string" ? raw.changeSummary : "";
  const rationale = typeof raw?.rationale === "string" ? raw.rationale : "";

  if (!updatedFileContent) {
    throw new Error("Gemini response is missing `updatedFileContent`.");
  }

  return {
    correctnessScore,
    issues,
    changeSummary,
    rationale,
    updatedFileContent,
  };
}

function buildPrompt({
  item,
  relativeFilePath,
  fileContent,
  targetScore,
  previousAttempts,
  latestValidation,
}) {
  const systemPrompt = [
    "You are a strict senior software engineer performing automated backlog correction.",
    "You must return JSON only with keys:",
    "correctnessScore, issues, changeSummary, rationale, updatedFileContent.",
    "correctnessScore must be an integer from 0 to 100.",
    "updatedFileContent must be the full replacement text for the file.",
    "Score 100 only when all acceptance criteria are satisfied and validation output is clean.",
  ].join(" ");

  const userPayload = {
    backlogItem: {
      id: item.id || null,
      title: item.title || null,
      description: item.description || "",
      acceptanceCriteria: Array.isArray(item.acceptanceCriteria) ? item.acceptanceCriteria : [],
      context: item.context || "",
    },
    filePath: relativeFilePath,
    targetScore,
    latestValidation,
    previousAttempts,
    currentFileContent: fileContent,
  };

  return `${systemPrompt}\n\nInput:\n${JSON.stringify(userPayload, null, 2)}\n\nReturn JSON only.`;
}

async function requestGeminiFix({
  client,
  modelChain,
  skippedModels,
  item,
  relativeFilePath,
  fileContent,
  targetScore,
  previousAttempts,
  latestValidation,
}) {
  let lastError;
  const modelErrors = [];

  for (const modelName of modelChain) {
    if (skippedModels.has(modelName)) {
      continue;
    }

    try {
      const model = client.getGenerativeModel({ model: modelName });
      const prompt = buildPrompt({
        item,
        relativeFilePath,
        fileContent,
        targetScore,
        previousAttempts,
        latestValidation,
      });

      const generated = await model.generateContent(prompt);
      const parsed = parseGeminiJson(generated.response.text());
      return {
        modelName,
        result: normalizeGeminiResult(parsed),
        skippedBeforeSuccess: modelErrors,
      };
    } catch (error) {
      lastError = error;
      const category = classifyGeminiError(error);
      if (category === "rate_limited" || category === "unavailable") {
        skippedModels.add(modelName);
      }
      modelErrors.push({
        modelName,
        category,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (lastError) {
    const detail = modelErrors.map((entry) => `${entry.modelName}: ${entry.message}`).join(" | ");
    throw new Error(`Gemini request failed for all configured models. ${detail}`);
  }

  throw new Error("Gemini request failed for all configured models.");
}

export async function processBacklogItem(item, options) {
  const {
    client,
    modelChain,
    maxIterations,
    targetScore,
    writeChanges,
    globalValidationCommand,
  } = options;

  if (!item || typeof item !== "object") {
    throw new Error("Backlog item must be an object.");
  }

  if (!item.filePath) {
    throw new Error("Backlog item is missing `filePath`.");
  }

  const absoluteFilePath = safeResolveFile(item.filePath);
  if (!fs.existsSync(absoluteFilePath) && item.createIfMissing !== true) {
    throw new Error(`Target file does not exist: ${item.filePath}`);
  }

  let fileContent = fs.existsSync(absoluteFilePath) ? fs.readFileSync(absoluteFilePath, "utf8") : "";
  let latestValidation = {
    ok: true,
    exitCode: 0,
    output: "No validation has run yet.",
  };
  const skippedModels = new Set();
  const attempts = [];

  for (let attempt = 1; attempt <= maxIterations; attempt += 1) {
    const { modelName, result, skippedBeforeSuccess } = await requestGeminiFix({
      client,
      modelChain,
      skippedModels,
      item,
      relativeFilePath: path.relative(repoRoot, absoluteFilePath),
      fileContent,
      targetScore,
      previousAttempts: attempts.map((entry) => ({
        attempt: entry.attempt,
        correctnessScore: entry.correctnessScore,
        issues: entry.issues,
        changeSummary: entry.changeSummary,
        validationOk: entry.validation?.ok ?? null,
      })),
      latestValidation,
    });

    const changed = result.updatedFileContent !== fileContent;
    if (changed) {
      fileContent = result.updatedFileContent;
      if (writeChanges) {
        fs.writeFileSync(absoluteFilePath, fileContent, "utf8");
      }
    }

    const validationCommand = item.validationCommand || globalValidationCommand;
    latestValidation = runValidationCommand(validationCommand);

    const successful = result.correctnessScore >= targetScore && latestValidation.ok;
    const attemptRecord = {
      attempt,
      modelName,
      skippedBeforeSuccess,
      correctnessScore: result.correctnessScore,
      issues: result.issues,
      changeSummary: result.changeSummary,
      rationale: result.rationale,
      changed,
      writeApplied: changed && writeChanges,
      validation: latestValidation,
      successful,
    };
    attempts.push(attemptRecord);

    if (successful) {
      return {
        id: item.id || null,
        filePath: item.filePath,
        ok: true,
        finalScore: result.correctnessScore,
        attempts,
      };
    }
  }

  const last = attempts.at(-1);
  return {
    id: item.id || null,
    filePath: item.filePath,
    ok: false,
    finalScore: last?.correctnessScore ?? 0,
    attempts,
  };
}

export async function runBacklogAutoFix({
  items,
  maxIterations = 5,
  targetScore = 100,
  writeChanges = true,
  globalValidationCommand = "",
} = {}) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("No backlog items provided.");
  }

  const geminiConfig = resolveGeminiConfig();
  if (!geminiConfig.hasApiKey) {
    throw new Error(
      "Gemini API key not found. Set GEMINI_API_KEY or provide it in fairdev/apps/api/.env (or SAT0RU-main/ml/.env).",
    );
  }

  const configuredModelChain = buildGeminiModelChain(geminiConfig);
  const client = new GoogleGenerativeAI(geminiConfig.apiKey);
  const modelDiscovery = await resolveActiveModelChain(geminiConfig.apiKey, configuredModelChain);
  if (modelDiscovery.modelChain.length === 0) {
    throw new Error("No runnable Gemini models were resolved.");
  }
  const modelPreload = warmLoadGeminiModels(client, modelDiscovery.modelChain);
  const activeModelChain = modelPreload.loaded.length > 0 ? modelPreload.loaded : modelDiscovery.modelChain;

  const startedAt = new Date().toISOString();
  const results = [];

  for (const item of items) {
    try {
      results.push(
        await processBacklogItem(item, {
          client,
          modelChain: activeModelChain,
          maxIterations,
          targetScore,
          writeChanges,
          globalValidationCommand,
        }),
      );
    } catch (error) {
      results.push({
        id: item?.id || null,
        filePath: item?.filePath || null,
        ok: false,
        finalScore: 0,
        attempts: [],
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const succeeded = results.filter((entry) => entry.ok).length;
  return {
    startedAt,
    completedAt: new Date().toISOString(),
    writeChanges,
    targetScore,
    maxIterations,
    configuredModelChain: modelDiscovery.configuredModelChain,
    modelChain: modelDiscovery.modelChain,
    activeModelChain,
    modelDiscoveryWarning: modelDiscovery.warning,
    geminiPreload: {
      loadedCount: modelPreload.loaded.length,
      failedCount: modelPreload.failed.length,
      loaded: modelPreload.loaded,
      failed: modelPreload.failed,
    },
    modelScores: modelDiscovery.modelChain.map((modelName) => ({
      modelName,
      score: scoreGeminiModelName(modelName),
    })),
    envSources: geminiConfig.loadedFrom,
    summary: {
      total: results.length,
      succeeded,
      failed: results.length - succeeded,
    },
    results,
  };
}

function saveReport(reportPath, report) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

async function runCli() {
  const options = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(options.backlogPath)) {
    throw new Error(`Backlog file not found: ${options.backlogPath}`);
  }

  const payload = readBacklogPayload(options.backlogPath);
  const report = await runBacklogAutoFix({
    items: payload.items,
    maxIterations: payload.maxIterations ?? options.maxIterations,
    targetScore: payload.targetScore ?? options.targetScore,
    writeChanges: payload.writeChanges ?? options.writeChanges,
    globalValidationCommand: payload.globalValidationCommand ?? options.globalValidationCommand,
  });

  saveReport(options.reportPath, report);
  console.log(`Backlog autofix report written to ${options.reportPath}`);
  console.log(`Succeeded ${report.summary.succeeded}/${report.summary.total} items`);

  if (report.summary.failed > 0) {
    process.exitCode = 1;
  }
}

if (path.resolve(process.argv[1] || "") === __filename) {
  runCli().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
