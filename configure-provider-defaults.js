const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");

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
      model: firstModel ? `lmstudio/${firstModel.id}` : "lmstudio/local-model"
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
      model: firstModel ? `ollama/${firstModel.name}` : "ollama/llama3.2"
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

(async () => {
  fs.mkdirSync(openclawDir, { recursive: true });

  let cfg = {};
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

  if (hasExistingModelConfig(cfg)) {
    console.log("EXISTING_MODEL_CONFIG");
    process.exit(0);
  }

  const provider = await detectProvider();
  if (!provider) {
    console.log("NO_LOCAL_PROVIDER");
    process.exit(0);
  }

  if (!cfg.models) cfg.models = {};
  if (!cfg.models.providers) cfg.models.providers = {};
  cfg.models.providers[provider.id] = {
    baseUrl: provider.baseUrl,
    api: "openai-completions",
    apiKey: provider.apiKey,
    injectNumCtxForOpenAICompat: true
  };

  if (!cfg.agents) cfg.agents = {};
  if (!cfg.agents.defaults) cfg.agents.defaults = {};
  cfg.agents.defaults.model = provider.model;

  fs.writeFileSync(configPath, `${JSON.stringify(cfg, null, 2)}\n`);
  console.log(`PROVIDER_DEFAULT_SET:${provider.source}`);
})();
