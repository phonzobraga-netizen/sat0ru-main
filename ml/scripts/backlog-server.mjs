import http from "node:http";
import { runBacklogAutoFix } from "./backlog-autofix.mjs";

const port = Number.parseInt(process.env.BACKLOG_AUTOFIX_PORT || "4015", 10);

function writeJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  });
  res.end(`${JSON.stringify(payload, null, 2)}\n`);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 2 * 1024 * 1024) {
        reject(new Error("Request body too large."));
      }
    });

    req.on("end", () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        resolve(parsed);
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", (error) => reject(error));
  });
}

function normalizePayload(body) {
  if (Array.isArray(body)) {
    return { items: body };
  }

  if (body && typeof body === "object") {
    if (body.item && !body.items) {
      return { ...body, items: [body.item] };
    }
    if (Array.isArray(body.items)) {
      return body;
    }
  }

  throw new Error("Body must be an array of backlog items or an object with `items`.");
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    writeJson(res, 204, {});
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    writeJson(res, 200, {
      ok: true,
      service: "sat0ru-backlog-autofix",
      port,
      now: new Date().toISOString(),
    });
    return;
  }

  if (req.method === "POST" && req.url === "/backlog") {
    try {
      const body = await readJsonBody(req);
      const payload = normalizePayload(body);

      const report = await runBacklogAutoFix({
        items: payload.items,
        maxIterations: Number.parseInt(payload.maxIterations || "5", 10),
        targetScore: Number.parseInt(payload.targetScore || "100", 10),
        writeChanges: payload.writeChanges !== false,
        globalValidationCommand: payload.globalValidationCommand || "",
      });

      const statusCode = report.summary.failed > 0 ? 207 : 200;
      writeJson(res, statusCode, report);
    } catch (error) {
      writeJson(res, 400, {
        ok: false,
        message: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  }

  writeJson(res, 404, {
    ok: false,
    message: "Not found. Use GET /health or POST /backlog",
  });
});

server.listen(port, () => {
  console.log(`SAT0RU backlog autofix server listening on http://localhost:${port}`);
});
