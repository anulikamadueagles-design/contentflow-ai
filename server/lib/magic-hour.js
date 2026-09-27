const fs = require("fs");
const path = require("path");

let MagicHourClient = null;

try {
  const mh = require("magic-hour");
  MagicHourClient = mh.Client || mh.default || mh;
} catch (err) {
  console.warn("Magic Hour SDK not loaded:", err.message);
}

function getClient() {
  const key = process.env.MAGIC_HOUR_API_KEY;

  if (!key) {
    throw new Error(
      "MAGIC_HOUR_API_KEY is not configured. Add your Magic Hour API key to the environment."
    );
  }

  if (!MagicHourClient) {
    throw new Error(
      "Magic Hour SDK is unavailable. Run: npm install magic-hour"
    );
  }

  return new MagicHourClient({
    token: key
  });
}

async function generateTextToVideo({
  prompt,
  duration = 5,
  orientation = "portrait",
  resolution = "720p",
  model = "default",
  name = "ContentFlow AI Video"
}) {
  if (!prompt || prompt.trim().length < 3) {
    throw new Error("A video prompt is required.");
  }

  const seconds = Math.max(3, Math.min(Number(duration) || 5, 30));

  const client = getClient();

  const result = await client.v1.text_to_video.generate({
    name,
    end_seconds: seconds,
    orientation,
    resolution,
    style: {
      prompt: prompt.trim(),
      model
    }
  });

  return result;
}

async function generateImageToVideo({
  imageFilePath,
  duration = 5,
  resolution = "720p",
  name = "ContentFlow AI Image Video"
}) {
  if (!imageFilePath || !fs.existsSync(imageFilePath)) {
    throw new Error("Source image was not found.");
  }

  const client = getClient();

  return await client.v1.image_to_video.generate({
    name,
    assets: {
      image_file_path: imageFilePath
    },
    end_seconds: Math.max(3, Math.min(Number(duration) || 5, 30)),
    resolution
  });
}

function extractProjectId(result) {
  return (
    result?.id ||
    result?.project_id ||
    result?.projectId ||
    result?.data?.id ||
    result?.data?.project_id ||
    null
  );
}

function extractVideoUrl(result) {
  return (
    result?.video_url ||
    result?.videoUrl ||
    result?.download_url ||
    result?.downloadUrl ||
    result?.data?.video_url ||
    result?.data?.videoUrl ||
    result?.data?.download_url ||
    null
  );
}

module.exports = {
  generateTextToVideo,
  generateImageToVideo,
  extractProjectId,
  extractVideoUrl
};
