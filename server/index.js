require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const fs = require("fs");

const contentRoutes = require("./routes/content");
const videoRoutes = require("./routes/video");
const aiVideoRoutes = require("./routes/ai-video");
const { getStats } = require("./lib/analytics");

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

app.use(cors());

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

const publicDir = path.join(process.cwd(), "public");
const storageDir = path.join(process.cwd(), "storage");

fs.mkdirSync(path.join(storageDir, "uploads"), { recursive: true });
fs.mkdirSync(path.join(storageDir, "videos"), { recursive: true });

app.use(express.static(publicDir));

app.use(
  "/media",
  express.static(storageDir, {
    maxAge: "1h"
  })
);

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "ContentFlow AI",
    version: process.env.APP_VERSION || "3.2.0",
    demoMode: process.env.DEMO_MODE === "true",
    videoEngine: "Native FFmpeg",
    features: {
      contentStudio: true,
      repurposingKit: true,
      photoToVideo: true,
      contentCalendar: true,
      analytics: true,
      multiPlatform: true
    },
    timestamp: new Date().toISOString()
  });
});

app.get("/api/dashboard", (req, res) => {
  res.json({
    ok: true,
    stats: {
      ...getStats()
    }
  });
});

app.use("/api/content", contentRoutes);
app.use("/api/video", videoRoutes);
app.use("/api/ai-video", aiVideoRoutes);

app.use((req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.use((error, req, res, next) => {
  console.error(error);

  res.status(500).json({
    ok: false,
    error: error.message || "Server error."
  });
});

app.listen(PORT, () => {
  console.log("");
  console.log("==============================================");
  console.log("        CONTENTFLOW AI 3.2.0");
  console.log("==============================================");
  console.log(`Server: http://127.0.0.1:${PORT}`);
  console.log(`Demo mode: ${process.env.DEMO_MODE === "true"}`);
  console.log("Photo → Video: ENABLED");
  console.log("Repurposing Kit: ENABLED");
  console.log("Multi-platform engine: ENABLED");
  console.log("==============================================");
});
