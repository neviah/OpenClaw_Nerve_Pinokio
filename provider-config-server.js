const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const HOST = "127.0.0.1";
const PORT = 3097;

const OPENCLAW_DIR = path.join(os.homedir(), ".openclaw");
const CONFIG_PATH = path.join(OPENCLAW_DIR, "openclaw.json");

function ensureGatewayDefaults(cfg) {
  if (!cfg.gateway) cfg.gateway = {};
  if (!cfg.gateway.auth) cfg.gateway.auth = {};
  if (!cfg.gateway.auth.mode) cfg.gateway.auth.mode = "token";
  if (!cfg.gateway.auth.token || typeof cfg.gateway.auth.token !== "string") {
    cfg.gateway.auth.token = `ocn_${crypto.randomBytes(24).toString("hex")}`;
  }
  if (!cfg.gateway.mode || typeof cfg.gateway.mode !== "string") cfg.gateway.mode = "local";
  if (!cfg.gateway.bind || typeof cfg.gateway.bind !== "string") cfg.gateway.bind = "loopback";
  if (!cfg.gateway.port || typeof cfg.gateway.port !== "number") cfg.gateway.port = 18789;
}

function ensureShape(cfg) {
  if (!cfg.models) cfg.models = {};
  if (!cfg.models.providers || typeof cfg.models.providers !== "object") cfg.models.providers = {};
  if (!cfg.agents) cfg.agents = {};
  if (!cfg.agents.defaults) cfg.agents.defaults = {};
}

function readConfig() {
  fs.mkdirSync(OPENCLAW_DIR, { recursive: true });
  if (!fs.existsSync(CONFIG_PATH)) return {};
  const raw = fs.readFileSync(CONFIG_PATH, "utf8").trim();
  if (!raw) return {};
  return JSON.parse(raw);
}

function writeConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, `${JSON.stringify(cfg, null, 2)}\n`);
}

function modelEntry(modelId) {
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

function normalizeProviderPayload(payload) {
  const provider = typeof payload.provider === "string" ? payload.provider.trim().toLowerCase() : "";
  const modelId = typeof payload.modelId === "string" ? payload.modelId.trim() : "";
  let baseUrl = typeof payload.baseUrl === "string" ? payload.baseUrl.trim() : "";
  let apiKey = typeof payload.apiKey === "string" ? payload.apiKey.trim() : "";
  const setDefault = payload.setDefault !== false;

  if (!provider) throw new Error("Provider is required.");
  if (!modelId) throw new Error("Model id is required.");

  if (!baseUrl) {
    if (provider === "openrouter") baseUrl = "https://openrouter.ai/api/v1";
    if (provider === "lmstudio") baseUrl = "http://127.0.0.1:1234/v1";
    if (provider === "ollama") baseUrl = "http://127.0.0.1:11434/v1";
  }

  if (!baseUrl) throw new Error("Base URL is required.");

  if (!apiKey) {
    if (provider === "lmstudio") apiKey = "lm-studio";
    if (provider === "ollama") apiKey = "ollama";
  }

  if (!apiKey) throw new Error("API key is required for this provider.");

  return { provider, modelId, baseUrl, apiKey, setDefault };
}

function applyProviderConfig(payload) {
  const { provider, modelId, baseUrl, apiKey, setDefault } = normalizeProviderPayload(payload);
  const cfg = readConfig();
  ensureGatewayDefaults(cfg);
  ensureShape(cfg);

  cfg.models.providers[provider] = {
    baseUrl,
    api: "openai-completions",
    apiKey,
    injectNumCtxForOpenAICompat: true,
    models: [modelEntry(modelId)]
  };

  if (setDefault) {
    cfg.agents.defaults.model = `${provider}/${modelId}`;
  }

  writeConfig(cfg);
  return { provider, modelId, configPath: CONFIG_PATH };
}

function htmlPage() {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>OpenClaw Provider Setup</title>
  <style>
    :root {
      --bg0: #0f1218;
      --bg1: #151b24;
      --fg: #e8edf5;
      --muted: #9ca9bb;
      --line: #2a3443;
      --accent: #f5a623;
      --ok: #00b894;
      --bad: #ff7675;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", "SF Pro Text", "Helvetica Neue", sans-serif;
      color: var(--fg);
      background:
        radial-gradient(1100px 600px at 95% -10%, #2a3142 0%, transparent 45%),
        radial-gradient(900px 500px at -10% 110%, #24303f 0%, transparent 48%),
        linear-gradient(160deg, var(--bg0), var(--bg1));
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
    }
    .card {
      width: min(760px, 100%);
      border: 1px solid var(--line);
      border-radius: 14px;
      background: rgba(16, 21, 30, 0.88);
      backdrop-filter: blur(4px);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
      overflow: hidden;
    }
    .header {
      padding: 18px 20px;
      border-bottom: 1px solid var(--line);
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: baseline;
    }
    .title {
      margin: 0;
      font-size: 20px;
      letter-spacing: 0.2px;
    }
    .subtitle {
      margin: 0;
      color: var(--muted);
      font-size: 13px;
    }
    form {
      padding: 20px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    .full { grid-column: 1 / -1; }
    label {
      display: block;
      margin-bottom: 6px;
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    input, select {
      width: 100%;
      border: 1px solid var(--line);
      background: #0f141d;
      color: var(--fg);
      border-radius: 10px;
      padding: 11px 12px;
      outline: none;
      transition: border-color 140ms ease;
    }
    input:focus, select:focus { border-color: var(--accent); }
    .checkbox {
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--fg);
      font-size: 14px;
      margin-top: 4px;
    }
    .checkbox input { width: auto; }
    .actions {
      grid-column: 1 / -1;
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      margin-top: 4px;
    }
    button {
      border: 1px solid transparent;
      border-radius: 10px;
      padding: 10px 14px;
      font-weight: 600;
      cursor: pointer;
      color: #0b0f15;
      background: var(--accent);
    }
    button.secondary {
      background: transparent;
      color: var(--fg);
      border-color: var(--line);
    }
    .status {
      grid-column: 1 / -1;
      min-height: 20px;
      font-size: 13px;
    }
    .status.ok { color: var(--ok); }
    .status.bad { color: var(--bad); }
    .hint {
      grid-column: 1 / -1;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.45;
      border-top: 1px dashed var(--line);
      padding-top: 10px;
      margin-top: 4px;
    }
  </style>
</head>
<body>
  <section class="card">
    <div class="header">
      <h1 class="title">Provider Setup</h1>
      <p class="subtitle">Save provider config directly to OpenClaw</p>
    </div>

    <form id="provider-form">
      <div>
        <label for="provider">Provider</label>
        <select id="provider" name="provider">
          <option value="openrouter">OpenRouter</option>
          <option value="lmstudio">LM Studio</option>
          <option value="ollama">Ollama</option>
          <option value="openai">OpenAI-compatible</option>
        </select>
      </div>

      <div>
        <label for="modelId">Model ID</label>
        <input id="modelId" name="modelId" value="openai/gpt-4o-mini" />
      </div>

      <div class="full">
        <label for="baseUrl">Base URL</label>
        <input id="baseUrl" name="baseUrl" value="https://openrouter.ai/api/v1" />
      </div>

      <div class="full">
        <label for="apiKey">API Key</label>
        <input id="apiKey" name="apiKey" type="password" placeholder="Required for OpenRouter/OpenAI" />
      </div>

      <div class="full checkbox">
        <input id="setDefault" name="setDefault" type="checkbox" checked />
        <label for="setDefault" style="margin:0; text-transform:none; letter-spacing:0; font-size:14px; color:var(--fg);">Set as default provider/model</label>
      </div>

      <div class="actions">
        <button class="secondary" type="button" id="fill-openrouter">OpenRouter Preset</button>
        <button type="submit">Save Provider</button>
      </div>

      <div id="status" class="status"></div>

      <p class="hint">Tip: after save, restart Start in Pinokio so Nerve and OpenClaw pick up the updated defaults.</p>
    </form>
  </section>

  <script>
    const urlPresetProvider = new URLSearchParams(window.location.search).get("provider");

    const defaults = {
      openrouter: {
        modelId: "openai/gpt-4o-mini",
        baseUrl: "https://openrouter.ai/api/v1",
        apiKey: ""
      },
      lmstudio: {
        modelId: "qwen3.5-35b-a3b",
        baseUrl: "http://127.0.0.1:1234/v1",
        apiKey: "lm-studio"
      },
      ollama: {
        modelId: "llama3.2",
        baseUrl: "http://127.0.0.1:11434/v1",
        apiKey: "ollama"
      },
      openai: {
        modelId: "gpt-4o-mini",
        baseUrl: "https://api.openai.com/v1",
        apiKey: ""
      }
    };

    const form = document.getElementById("provider-form");
    const providerEl = document.getElementById("provider");
    const modelEl = document.getElementById("modelId");
    const baseEl = document.getElementById("baseUrl");
    const keyEl = document.getElementById("apiKey");
    const statusEl = document.getElementById("status");

    function setStatus(msg, ok) {
      statusEl.textContent = msg || "";
      statusEl.className = ok == null ? "status" : ok ? "status ok" : "status bad";
    }

    function applyPreset(provider) {
      const d = defaults[provider] || defaults.openrouter;
      modelEl.value = d.modelId;
      baseEl.value = d.baseUrl;
      if (!keyEl.value || provider === "lmstudio" || provider === "ollama") {
        keyEl.value = d.apiKey;
      }
    }

    if (urlPresetProvider && defaults[urlPresetProvider]) {
      providerEl.value = urlPresetProvider;
      applyPreset(urlPresetProvider);
    }

    providerEl.addEventListener("change", () => {
      applyPreset(providerEl.value);
      setStatus("", null);
    });

    document.getElementById("fill-openrouter").addEventListener("click", () => {
      providerEl.value = "openrouter";
      applyPreset("openrouter");
      setStatus("OpenRouter preset loaded.", true);
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      setStatus("Saving...", null);

      const payload = {
        provider: providerEl.value,
        modelId: modelEl.value,
        baseUrl: baseEl.value,
        apiKey: keyEl.value,
        setDefault: document.getElementById("setDefault").checked
      };

      try {
        const res = await fetch("/save", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
          setStatus(data && data.error ? data.error : "Save failed.", false);
          return;
        }
        setStatus("Saved " + data.provider + "/" + data.modelId + ". Restart Start in Pinokio.", true);
      } catch (err) {
        setStatus(err && err.message ? err.message : "Save failed.", false);
      }
    });
  </script>
</body>
</html>`;
}

function sendJson(res, code, data) {
  res.writeHead(code, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(htmlPage());
      return;
    }

    if (req.method === "POST" && req.url === "/save") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString("utf8");
      });
      req.on("end", () => {
        try {
          const payload = body ? JSON.parse(body) : {};
          const result = applyProviderConfig(payload);
          sendJson(res, 200, { ok: true, ...result });
        } catch (err) {
          sendJson(res, 400, { ok: false, error: err && err.message ? err.message : "Invalid payload" });
        }
      });
      return;
    }

    sendJson(res, 404, { ok: false, error: "Not found" });
  } catch (err) {
    sendJson(res, 500, { ok: false, error: err && err.message ? err.message : "Server error" });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`PROVIDER_CONFIG_UI:http://${HOST}:${PORT}`);
});
