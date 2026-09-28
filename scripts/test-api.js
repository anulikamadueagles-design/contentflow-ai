const http = require("http");

const port = Number(process.env.PORT || 3000);
const base = `http://127.0.0.1:${port}`;

function request(path) {
  return new Promise((resolve, reject) => {
    http.get(base + path, (res) => {
      let body = "";

      res.on("data", (chunk) => {
        body += chunk;
      });

      res.on("end", () => {
        resolve({
          status: res.statusCode,
          body
        });
      });
    }).on("error", reject);
  });
}

(async () => {
  try {
    const health = await request("/api/health");
    const platforms = await request("/api/content/platforms");

    console.log(`API TEST PORT: ${port}`);
    console.log(`HEALTH: ${health.status}`);
    console.log(`PLATFORMS: ${platforms.status}`);

    if (health.status !== 200) {
      throw new Error("Health endpoint failed");
    }

    if (platforms.status !== 200) {
      throw new Error("Platforms endpoint failed");
    }

    console.log("API SMOKE TEST: PASS");
  } catch (error) {
    console.error("API SMOKE TEST: FAIL");
    console.error(error.message);
    process.exit(1);
  }
})();
