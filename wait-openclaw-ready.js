const http = require("http");

const url = process.env.OPENCLAW_HEALTH_URL || "http://127.0.0.1:18789/health";
const maxAttempts = 120;
let attempts = 0;

function checkOnce() {
  attempts += 1;
  const req = http.get(url, (res) => {
    if (res.statusCode === 200) {
      console.log("OPENCLAW_READY");
      process.exit(0);
      return;
    }
    if (attempts >= maxAttempts) {
      console.error("OPENCLAW_HEALTH_TIMEOUT");
      process.exit(1);
      return;
    }
    setTimeout(checkOnce, 1000);
  });

  req.on("error", () => {
    if (attempts >= maxAttempts) {
      console.error("OPENCLAW_HEALTH_TIMEOUT");
      process.exit(1);
      return;
    }
    setTimeout(checkOnce, 1000);
  });

  req.setTimeout(1000, () => {
    req.destroy();
  });
}

checkOnce();
