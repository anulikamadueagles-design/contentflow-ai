const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const {
  createPhotoSlideshow,
  getJob,
  getStats
} = require("../lib/video");

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
  const {
    prompt,
    ratio = "9:16",
    duration = 10
  } = req.body;

  if (!prompt || !String(prompt).trim()) {
    return res.status(400).json({
      ok: false,
      error: "Video prompt is required."
    });
  }

  res.json({
    ok: true,
    job: {
      id: crypto.randomUUID(),
      type: "creative-video-plan",
      status: "completed",
      prompt,
      ratio,
      duration,
      message:
        "Creative video plan created."
    }
  });
});

router.get("/jobs/:id", (req, res) => {
  const job = getJob(req.params.id);

  if (!job) {
    return res.status(404).json({
      ok: false,
      error: "Video job not found."
    });
  }

  res.json({
    ok: true,
    job
  });
});

module.exports = router;
