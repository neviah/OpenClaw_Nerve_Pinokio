const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const crypto = require("crypto");

const openclawDir = path.join(os.homedir(), ".openclaw");
const configPath = path.join(openclawDir, "openclaw.json");

function requestJson(url, timeoutMs = 1200) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        let parsed = null;
        try {
          parsed = body ? JSON.parse(body) : null;
        } catch {
          parsed = null;
        }
        resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, body: parsed });
      });
    });
    req.on("error", () => resolve({ ok: false, status: 0, body: null }));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve({ ok: false, status: 0, body: null });
    });
  });
}

async function detectProvider() {
  const lm = await requestJson("http://127.0.0.1:1234/v1/models");
  if (lm.ok && lm.body && Array.isArray(lm.body.data)) {
    const firstModel = lm.body.data.find((m) => m && typeof m.id === "string");
    return {
      id: "lmstudio",
      source: "LMSTUDIO",
      baseUrl: "http://127.0.0.1:1234/v1",
      apiKey: "lm-studio",
      modelId: firstModel ? firstModel.id : "local-model"
    };
  }

  const ollama = await requestJson("http://127.0.0.1:11434/api/tags");
  if (ollama.ok && ollama.body && Array.isArray(ollama.body.models)) {
    const firstModel = ollama.body.models.find((m) => m && typeof m.name === "string");
    return {
      id: "ollama",
      source: "OLLAMA",
      baseUrl: "http://127.0.0.1:11434/v1",
      apiKey: "ollama",
      modelId: firstModel ? firstModel.name : "llama3.2"
    };
  }

  return null;
}

function hasExistingModelConfig(cfg) {
  const hasModel = !!(cfg && cfg.agents && cfg.agents.defaults && cfg.agents.defaults.model);
  const hasProviders = !!(
    cfg &&
    cfg.models &&
    cfg.models.providers &&
    typeof cfg.models.providers === "object" &&
    Object.keys(cfg.models.providers).length > 0
  );
  return hasModel || hasProviders;
}

function ensureGatewayToken(cfg) {
  if (!cfg.gateway) cfg.gateway = {};
  if (!cfg.gateway.auth) cfg.gateway.auth = {};
  if (!cfg.gateway.auth.mode) cfg.gateway.auth.mode = "token";
  if (!cfg.gateway.auth.token || typeof cfg.gateway.auth.token !== "string") {
    cfg.gateway.auth.token = `ocn_${crypto.randomBytes(24).toString("hex")}`;
    return true;
  }
  return false;
}

function buildModelEntry(modelId) {
  return {
    id: modelId,
    name: modelId,
    reasoning: false,
    input: ["text"],
    cost: {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0
    },
    contextWindow: 131072,
    contextTokens: 120000,
    maxTokens: 8192
  };
}

(async () => {
  fs.mkdirSync(openclawDir, { recursive: true });

  let cfg = {};
  let changed = false;
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, "utf8").trim();
    if (raw) {
      try {
        cfg = JSON.parse(raw);
      } catch {
        console.log("OPENCLAW_CONFIG_PARSE_SKIPPED");
        process.exit(0);
      }
    }
  }

  if (ensureGatewayToken(cfg)) {
    changed = true;
  }

  if (hasExistingModelConfig(cfg)) {
    if (changed) {
      fs.writeFileSync(configPath, `${JSON.stringify(cfg, null, 2)}\n`);
      console.log("GATEWAY_TOKEN_SET");
    }
    console.log("EXISTING_MODEL_CONFIG");
    process.exit(0);
  }

  const provider = await detectProvider();
  if (!provider) {
    if (changed) {
      fs.writeFileSync(configPath, `${JSON.stringify(cfg, null, 2)}\n`);
      console.log("GATEWAY_TOKEN_SET");
    }
    console.log("NO_LOCAL_PROVIDER");
    process.exit(0);
  }

  if (!cfg.models) cfg.models = {};
  if (!cfg.models.providers) cfg.models.providers = {};
  cfg.models.providers[provider.id] = {
    baseUrl: provider.baseUrl,
    api: "openai-completions",
    apiKey: provider.apiKey,
    injectNumCtxForOpenAICompat: true,
    models: [buildModelEntry(provider.modelId)]
  };

  if (!cfg.agents) cfg.agents = {};
  if (!cfg.agents.defaults) cfg.agents.defaults = {};
  cfg.agents.defaults.model = `${provider.id}/${provider.modelId}`;

  fs.writeFileSync(configPath, `${JSON.stringify(cfg, null, 2)}\n`);
  console.log(`PROVIDER_DEFAULT_SET:${provider.source}`);
})();
