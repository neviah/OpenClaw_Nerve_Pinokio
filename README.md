# OpenClaw + Nerve Pinokio Launcher

This launcher installs and runs OpenClaw (gateway) and Nerve (web UI) in sequence:

1. Install OpenClaw globally.
2. Create an empty OpenClaw config at `~/.openclaw/openclaw.json` if it does not exist.
3. Clone and build Nerve in `app/nerve`.
4. Start OpenClaw first, then start Nerve.

No interactive onboarding prompts are required during install.

## Scripts

- `install.js`: installs OpenClaw and Nerve.
- `start.js`: starts OpenClaw, waits for health, writes Nerve `.env`, then starts Nerve.
- `update.js`: updates launcher repo, OpenClaw, and Nerve upstream.
- `reset.js`: removes `app/nerve`.
- `pinokio.js`: sidebar menu and run-state UI.

## First Run

1. Click **Install**.
2. Click **Start**.
3. Open Nerve from the menu.
4. Configure model/provider settings from OpenClaw or Nerve settings after startup.

## Programmatic Checks

Use these examples to verify services are up.

### JavaScript (Node.js)

```javascript
const http = require("http");

function check(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      resolve({ url, status: res.statusCode });
    }).on("error", (err) => {
      resolve({ url, error: err.message });
    });
  });
}

(async () => {
  const results = await Promise.all([
    check("http://127.0.0.1:18789/health"),
    check("http://127.0.0.1:3080/")
  ]);
  console.log(results);
})();
```

### Python

```python
import requests

for url in ["http://127.0.0.1:18789/health", "http://127.0.0.1:3080/"]:
    try:
        r = requests.get(url, timeout=5)
        print(url, r.status_code)
    except Exception as exc:
        print(url, str(exc))
```

### cURL

```bash
curl -i http://127.0.0.1:18789/health
curl -i http://127.0.0.1:3080/
```
