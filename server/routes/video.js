const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const {
  createPhotoSlideshow,
  getJob: getPhotoJob,
  getStats
} = require("../lib/video");

const {
  generate: generateAIVideo,
  getJob: getAIVideoJob
} = require("../lib/ai-video");

const router = express.Router();

const uploadDir = path.join(
  process.cwd(),
  "storage",
  "uploads"
);

fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  dest: uploadDir,
  limits: {
    files: 12,
    fileSize: 15 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Only JPG, PNG and WEBP images are supported."
        )
      );
    }
  }
});

router.get("/stats", (req, res) => {
  res.json({
    ok: true,
    stats: getStats()
  });
});

router.post(
  "/photo-slideshow",
  upload.array("photos", 12),
  async (req, res, next) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          ok: false,
          error: "Upload at least one photo."
        });
      }

      const job = await createPhotoSlideshow(
        req.files,
        {
          ratio: req.body.ratio,
          duration: req.body.duration
        }
      );

      res.json({
        ok: true,
        message:
          "Photo video generation started.",
        job
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post("/generate", async (req, res) => {
  try {
    const {
      prompt,
      provider = "magic-hour",
      ratio = "9:16",
      duration = 5,
      resolution = "720p",
      model,
      name
    } = req.body || {};

    if (!prompt || !String(prompt).trim()) {
      return res.status(400).json({
        ok: false,
        error: "Video prompt is required."
      });
    }

    const orientation =
      ratio === "16:9"
        ? "landscape"
        : ratio === "1:1"
          ? "square"
          : "portrait";

    const job = await generateAIVideo(provider, {
      prompt,
      duration,
      orientation,
      resolution,
      model,
      name
    });

    res.status(202).json({
      ok: true,
      message: "AI video generation started.",
      job
    });
  } catch (error) {
    console.error("VIDEO GENERATION ERROR:", error);

    const status =
      /API key is not configured/i.test(error.message || "")
        ? 503
        : 400;

    res.status(status).json({
      ok: false,
      error: error.message || "AI video generation failed."
    });
  }
});

router.get("/jobs/:id", (req, res) => {
  const photoJob = getPhotoJob(req.params.id);

  if (photoJob) {
    return res.json({
      ok: true,
      job: photoJob
    });
  }

  const aiJob = getAIVideoJob(req.params.id);

  if (aiJob) {
    return res.json({
      ok: true,
      job: aiJob
    });
  }

  res.status(404).json({
    ok: false,
    error: "Video job not found."
  });
});

module.exports = router;
