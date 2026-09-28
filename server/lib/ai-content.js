const { generateAI, parseJSON } = require("./ai-provider");
const base = require("./content-engine");

async function generateContent(input = {}) {
  const configured =
    process.env.AI_API_URL &&
    process.env.AI_API_KEY &&
    process.env.AI_MODEL;

  if (configured) {
    const result = await generateAI({
      system:
        "You are a professional social media strategist. " +
        "Return ONLY valid JSON. No markdown.",
      user:
        "Create social media content.\n" +
        "Platform: " + (input.platform || "instagram") + "\n" +
        "Tone: " + (input.tone || "professional") + "\n" +
        "Audience: " + (input.audience || "general audience") + "\n" +
        "Topic: " + (input.topic || input.subject || input.prompt || "") + "\n" +
        "Return JSON with hook, caption, callToAction and hashtags."
    });

    const parsed = parseJSON(result);

    if (parsed) {
      return {
        ...parsed,
        platform: input.platform || "instagram",
        mode: "ai"
      };
    }
  }

  return {
    ...base.generateContent(input),
    mode: "demo"
  };
}

module.exports = {
  ...base,
  generateContent
};
