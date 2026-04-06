const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { execSync } = require("child_process");

const nerveEnvPath = path.join(process.cwd(), ".env");
const openclawPath = path.join(os.homedir(), ".openclaw", "openclaw.json");

function loadConfig() {
  if (!fs.existsSync(openclawPath)) return {};
  const raw = fs.readFileSync(openclawPath, "utf8").trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveConfig(cfg) {
  fs.mkdirSync(path.dirname(openclawPath), { recursive: true });
  fs.writeFileSync(openclawPath, `${JSON.stringify(cfg, null, 2)}\n`);
}

function detectOpenclawBin() {
  try {
    if (process.platform === "win32") {
      const out = execSync("where openclaw", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
      if (!out) return "";
      return out.split(/\r?\n/)[0].trim();
    }
    const out = execSync("which openclaw", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    return out || "";
  } catch {
    return "";
  }
}

const cfg = loadConfig();
if (!cfg.gateway) cfg.gateway = {};
if (!cfg.gateway.auth) cfg.gateway.auth = {};
if (!cfg.gateway.auth.mode) cfg.gateway.auth.mode = "token";
if (!cfg.gateway.auth.token || typeof cfg.gateway.auth.token !== "string") {
  cfg.gateway.auth.token = `ocn_${crypto.randomBytes(24).toString("hex")}`;
}

const port = String((cfg.gateway && cfg.gateway.port) || 18789);
const token = String(cfg.gateway.auth.token || "");
const openclawBin = detectOpenclawBin();

saveConfig(cfg);

const lines = [
  `GATEWAY_URL=http://127.0.0.1:${port}`,
  `GATEWAY_TOKEN=${token}`,
  "PORT=3080"
];
if (openclawBin) {
  lines.push(`OPENCLAW_BIN=${openclawBin.replace(/\\/g, "\\\\")}`);
}

fs.writeFileSync(nerveEnvPath, `${lines.join("\n")}\n`);
console.log("NERVE_ENV_READY");
