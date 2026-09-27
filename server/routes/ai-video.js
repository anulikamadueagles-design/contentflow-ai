const express = require("express");

const router = express.Router();

const {
  hasKey,
  getJob,
  listJobs,
  generate
} = require("../lib/ai-video");

router.get("/status", (req, res) => {
  res.json({
    ok: true,
    providers: {
      magicHour: {
        name: "Magic Hour",
        enabled: hasKey("magic-hour"),
        type: "generative-text-to-video"
      },
      pixazo: {
        name: "Pixazo",
        enabled: hasKey("pixazo"),
        type: "generative-text-to-video"
      }
    }
  });
});

router.get("/jobs", (req, res) => {
  res.json({
    ok: true,
    jobs: listJobs()
  });
});

router.get("/jobs/:id", (req, res) => {
  const job = getJob(req.params.id);

  if (!job) {
    return res.status(404).json({
      ok: false,
      error: "AI video job not found."
    });
  }

  res.json({
    ok: true,
    job
  });
});

router.post("/generate", async (req, res) => {
  try {
    const body = req.body || {};

    const provider =
      body.provider === "pixazo"
        ? "pixazo"
        : "magic-hour";

    const job = await generate(provider, {
      prompt: body.prompt,
      duration: body.duration,
      orientation: body.orientation,
      resolution: body.resolution,
      model: body.model,
      name: body.name
    });

    res.status(202).json({
      ok: true,
      job
    });
  } catch (error) {
    console.error("AI VIDEO GENERATION ERROR:", error);

    res.status(400).json({
      ok: false,
      error: error.message || "AI video generation failed."
    });
  }
});

module.exports = router;
