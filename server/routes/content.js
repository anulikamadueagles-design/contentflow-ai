const express = require("express");
const { increment } = require("../lib/analytics");
const { generateContent, repurpose, calendar, platforms } = require("../lib/ai-content");

const router = express.Router();

router.get("/platforms", (req, res) => {
  res.json({
    ok: true,
    platforms: Object.entries(platforms).map(([id, value]) => ({
      id,
      name: value.name,
      style: value.style
    }))
  });
});

router.post("/generate", async (req, res) => {
  const { topic, platform, tone, audience } = req.body;

  if (!topic || !String(topic).trim()) {
    return res.status(400).json({
      ok: false,
      error: "Topic is required."
    });
  }

  try {
    const result = await generateContent({
      topic,
      platform,
      tone,
      audience
    });

    increment("contentCreated");

    res.json({
      ok: true,
      mode: result?.mode || "demo",
      result
    });
  } catch (error) {
    console.error("CONTENT GENERATE ERROR:", error);
    res.status(500).json({
      ok: false,
      error: error.message || "Content generation failed."
    });
  }
});

router.post("/repurpose", async (req, res) => {
  const { source, topic, tone, audience } = req.body;

  if (!source && !topic) {
    return res.status(400).json({
      ok: false,
      error: "Add original content or a topic."
    });
  }

  try {
    const platformsResult = await Promise.resolve(repurpose({
      source,
      topic,
      tone,
      audience
    }));

    increment("repurposedKits");

    res.json({
      ok: true,
      mode: "demo",
      platforms: platformsResult
    });
  } catch (error) {
    console.error("CONTENT REPURPOSE ERROR:", error);
    res.status(500).json({
      ok: false,
      error: error.message || "Content repurposing failed."
    });
  }
});

router.post("/calendar", (req, res) => {
  const { topic, days } = req.body;

  if (!topic || !String(topic).trim()) {
    return res.status(400).json({
      ok: false,
      error: "Topic is required."
    });
  }

  res.json({
    ok: true,
    calendar: calendar(topic, days)
  });
});

module.exports = router;
