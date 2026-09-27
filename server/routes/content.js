const express = require("express");
const { generateContent, repurpose, calendar, platforms } = require("../lib/content-engine");

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

router.post("/generate", (req, res) => {
  const { topic, platform, tone, audience } = req.body;

  if (!topic || !String(topic).trim()) {
    return res.status(400).json({
      ok: false,
      error: "Topic is required."
    });
  }

  res.json({
    ok: true,
    mode: process.env.DEMO_MODE === "true" ? "demo" : "production",
    result: generateContent({
      topic,
      platform,
      tone,
      audience
    })
  });
});

router.post("/repurpose", (req, res) => {
  const { source, topic, tone, audience } = req.body;

  if (!source && !topic) {
    return res.status(400).json({
      ok: false,
      error: "Add original content or a topic."
    });
  }

  res.json({
    ok: true,
    mode: process.env.DEMO_MODE === "true" ? "demo" : "production",
    platforms: repurpose({
      source,
      topic,
      tone,
      audience
    })
  });
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
