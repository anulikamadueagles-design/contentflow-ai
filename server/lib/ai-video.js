const fs = require("fs");
const path = require("path");

const JOB_DIR = path.join(process.cwd(), "storage", "ai-video-jobs");
const JOB_FILE = path.join(JOB_DIR, "jobs.json");

fs.mkdirSync(JOB_DIR, { recursive: true });

let jobs = new Map();

try {
  if (fs.existsSync(JOB_FILE)) {
    const saved = JSON.parse(fs.readFileSync(JOB_FILE, "utf8"));
    if (Array.isArray(saved)) {
      for (const job of saved) jobs.set(job.id, job);
    }
  }
} catch (error) {
  console.error("AI video job restore failed:", error.message);
}

function persist() {
  try {
    fs.writeFileSync(
      JOB_FILE,
      JSON.stringify(Array.from(jobs.values()), null, 2)
    );
  } catch (error) {
    console.error("AI video job persistence failed:", error.message);
  }
}

function makeId(provider) {
  return (
    "cfv_" +
    provider.replace(/[^a-z0-9]/gi, "") +
    "_" +
    Date.now().toString(36) +
    "_" +
    Math.random().toString(36).slice(2, 8)
  );
}

function hasKey(provider) {
  if (provider === "magic-hour") {
    return Boolean(process.env.MAGIC_HOUR_API_KEY);
  }

  if (provider === "pixazo") {
    return Boolean(process.env.PIXAZO_API_KEY);
  }

  return false;
}

function createJob(provider, payload) {
  const id = makeId(provider);

  const job = {
    id,
    provider,
    status: "queued",
    prompt: payload.prompt,
    duration: Number(payload.duration || 5),
    orientation: payload.orientation || "portrait",
    resolution: payload.resolution || "720p",
    model: payload.model || "default",
    name: payload.name || "ContentFlow AI Video",
    providerJobId: null,
    providerStatus: null,
    videoUrl: null,
    pollUrl: null,
    error: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  jobs.set(id, job);
  persist();

  return job;
}

function updateJob(id, patch) {
  const job = jobs.get(id);

  if (!job) return null;

  Object.assign(job, patch, {
    updatedAt: new Date().toISOString()
  });

  jobs.set(id, job);
  persist();

  return job;
}

function getJob(id) {
  return jobs.get(id) || null;
}

function listJobs() {
  return Array.from(jobs.values())
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 100);
}

function cleanVideoUrl(value) {
  if (!value) return null;

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = cleanVideoUrl(item);
      if (found) return found;
    }
  }

  if (typeof value === "object") {
    return (
      value.url ||
      value.media_url ||
      value.video_url ||
      value.videoUrl ||
      value.download_url ||
      null
    );
  }

  return null;
}

async function responseJson(response) {
  const text = await response.text();

  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const message =
      data.message ||
      data.error ||
      data.detail ||
      data.raw ||
      `HTTP ${response.status}`;

    throw new Error(message);
  }

  return data;
}

/* ======================================================
   MAGIC HOUR
   ====================================================== */

async function magicHourCreate(payload, job) {
  const body = {
    name: payload.name || "ContentFlow AI Video",
    end_seconds: Number(payload.duration || 5),
    orientation:
      payload.orientation === "landscape"
        ? "landscape"
        : payload.orientation === "square"
          ? "square"
          : "portrait",
    resolution: payload.resolution || "720p",
    style: {
      prompt: payload.prompt
    }
  };

  if (payload.model && payload.model !== "default") {
    body.model = payload.model;
  }

  const response = await fetch(
    "https://api.magichour.ai/v1/text-to-video",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MAGIC_HOUR_API_KEY}`
      },
      body: JSON.stringify(body)
    }
  );

  const data = await responseJson(response);

  const providerJobId =
    data.id ||
    data.project_id ||
    data.projectId;

  if (!providerJobId) {
    throw new Error(
      "Magic Hour did not return a project ID."
    );
  }

  const videoUrl = cleanVideoUrl(
    data.video_url ||
    data.videoUrl ||
    data.download_url ||
    data.downloads
  );

  updateJob(job.id, {
    status: videoUrl ? "completed" : "processing",
    providerJobId,
    providerStatus: data.status || "queued",
    videoUrl
  });

  if (!videoUrl) {
    startMagicHourPolling(job.id);
  }

  return getJob(job.id);
}

async function magicHourStatus(job) {
  const response = await fetch(
    `https://api.magichour.ai/v1/video-projects/${encodeURIComponent(
      job.providerJobId
    )}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.MAGIC_HOUR_API_KEY}`
      }
    }
  );

  return responseJson(response);
}

async function pollMagicHour(jobId) {
  const job = getJob(jobId);

  if (!job || job.status === "completed" || job.status === "failed") {
    return;
  }

  try {
    const data = await magicHourStatus(job);

    const status = String(
      data.status ||
      data.state ||
      "processing"
    ).toLowerCase();

    const videoUrl = cleanVideoUrl(
      data.video_url ||
      data.videoUrl ||
      data.download_url ||
      data.downloads
    );

    if (
      status === "complete" ||
      status === "completed" ||
      videoUrl
    ) {
      updateJob(jobId, {
        status: "completed",
        providerStatus: status,
        videoUrl,
        raw: undefined
      });

      return;
    }

    if (
      status === "error" ||
      status === "failed" ||
      status === "canceled" ||
      status === "cancelled"
    ) {
      updateJob(jobId, {
        status: "failed",
        providerStatus: status,
        error:
          data.error ||
          data.message ||
          "Magic Hour generation failed."
      });

      return;
    }

    updateJob(jobId, {
      status: "processing",
      providerStatus: status
    });
  } catch (error) {
    updateJob(jobId, {
      status: "failed",
      error: `Magic Hour status check failed: ${error.message}`
    });
  }
}

function startMagicHourPolling(jobId) {
  let attempts = 0;
  const maxAttempts = 180;

  const timer = setInterval(async () => {
    attempts += 1;

    await pollMagicHour(jobId);

    const job = getJob(jobId);

    if (
      !job ||
      job.status === "completed" ||
      job.status === "failed" ||
      attempts >= maxAttempts
    ) {
      clearInterval(timer);

      if (attempts >= maxAttempts && job && job.status === "processing") {
        updateJob(jobId, {
          status: "failed",
          error: "Magic Hour generation timed out."
        });
      }
    }
  }, 8000);
}

/* ======================================================
   PIXAZO
   ====================================================== */

async function pixazoCreate(payload, job) {
  const endpoint =
    process.env.PIXAZO_TEXT_TO_VIDEO_URL ||
    "https://api.pixazo.ai/v1/text-to-video";

  const body = {
    prompt: payload.prompt,
    duration: Number(payload.duration || 5),
    aspect_ratio:
      payload.orientation === "landscape"
        ? "16:9"
        : payload.orientation === "square"
          ? "1:1"
          : "9:16",
    resolution: payload.resolution || "720p"
  };

  /*
   * PIXAZO_MODEL is optional.
   * This keeps the default Pixazo endpoint compatible with
   * its current documented request shape while allowing a
   * model-specific endpoint to receive a model when needed.
   */
  if (
    process.env.PIXAZO_MODEL &&
    process.env.PIXAZO_MODEL !== "default"
  ) {
    body.model = process.env.PIXAZO_MODEL;
  }

  if (payload.model && payload.model !== "default") {
    body.model = payload.model;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.PIXAZO_API_KEY}`
    },
    body: JSON.stringify(body)
  });

  const data = await responseJson(response);

  const providerJobId =
    data.job_id ||
    data.request_id ||
    data.id;

  const pollUrl =
    data.poll_url ||
    data.polling_url ||
    null;

  const videoUrl = cleanVideoUrl(
    data.output_url ||
    data.video_url ||
    data.videoUrl ||
    data.output
  );

  if (!providerJobId && !videoUrl) {
    throw new Error(
      "Pixazo did not return a job ID or output video."
    );
  }

  updateJob(job.id, {
    status: videoUrl ? "completed" : "processing",
    providerJobId,
    providerStatus: data.status || "processing",
    pollUrl,
    videoUrl
  });

  if (!videoUrl && providerJobId) {
    startPixazoPolling(job.id);
  }

  return getJob(job.id);
}

async function pixazoStatus(job) {
  const pollUrl =
    job.pollUrl ||
    `https://api.pixazo.ai/v1/jobs/${encodeURIComponent(
      job.providerJobId
    )}`;

  const response = await fetch(pollUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${process.env.PIXAZO_API_KEY}`,
      "Ocp-Apim-Subscription-Key":
        process.env.PIXAZO_API_KEY
    }
  });

  return responseJson(response);
}

async function pollPixazo(jobId) {
  const job = getJob(jobId);

  if (!job || job.status === "completed" || job.status === "failed") {
    return;
  }

  try {
    const data = await pixazoStatus(job);

    const status = String(
      data.status ||
      data.state ||
      "processing"
    ).toUpperCase();

    const videoUrl = cleanVideoUrl(
      data.output_url ||
      data.video_url ||
      data.videoUrl ||
      data.output
    );

    if (
      status === "COMPLETED" ||
      status === "COMPLETE" ||
      Boolean(videoUrl)
    ) {
      updateJob(jobId, {
        status: "completed",
        providerStatus: status,
        videoUrl
      });

      return;
    }

    if (
      status === "FAILED" ||
      status === "ERROR" ||
      status === "CANCELED" ||
      status === "CANCELLED"
    ) {
      updateJob(jobId, {
        status: "failed",
        providerStatus: status,
        error:
          data.error ||
          data.message ||
          "Pixazo generation failed."
      });

      return;
    }

    updateJob(jobId, {
      status: "processing",
      providerStatus: status
    });
  } catch (error) {
    updateJob(jobId, {
      status: "failed",
      error: `Pixazo status check failed: ${error.message}`
    });
  }
}

function startPixazoPolling(jobId) {
  let attempts = 0;
  const maxAttempts = 180;

  const timer = setInterval(async () => {
    attempts += 1;

    await pollPixazo(jobId);

    const job = getJob(jobId);

    if (
      !job ||
      job.status === "completed" ||
      job.status === "failed" ||
      attempts >= maxAttempts
    ) {
      clearInterval(timer);

      if (attempts >= maxAttempts && job && job.status === "processing") {
        updateJob(jobId, {
          status: "failed",
          error: "Pixazo generation timed out."
        });
      }
    }
  }, 8000);
}

/* ======================================================
   PUBLIC ENGINE
   ====================================================== */

async function generate(provider, payload) {
  provider =
    provider === "pixazo"
      ? "pixazo"
      : "magic-hour";

  if (!hasKey(provider)) {
    throw new Error(
      `${provider === "magic-hour" ? "Magic Hour" : "Pixazo"} API key is not configured.`
    );
  }

  const prompt = String(payload.prompt || "").trim();

  if (!prompt) {
    throw new Error("Video prompt is required.");
  }

  if (prompt.length > 5000) {
    throw new Error("Video prompt is too long.");
  }

  const normalized = {
    ...payload,
    prompt,
    resolution: provider === "magic-hour"
      ? "480p"
      : (payload.resolution || "720p"),
    duration: Math.min(
      60,
      Math.max(2, Number(payload.duration || 5))
    )
  };

  const job = createJob(provider, normalized);

  try {
    if (provider === "magic-hour") {
      return await magicHourCreate(normalized, job);
    }

    return await pixazoCreate(normalized, job);
  } catch (error) {
    updateJob(job.id, {
      status: "failed",
      error: error.message
    });

    throw error;
  }
}

module.exports = {
  jobs,
  hasKey,
  createJob,
  updateJob,
  getJob,
  listJobs,
  generate
};
