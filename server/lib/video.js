const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawn } = require("child_process");

const jobs = new Map();

const ROOT = path.join(process.cwd(), "storage");
const VIDEO_DIR = path.join(ROOT, "videos");

fs.mkdirSync(VIDEO_DIR, { recursive: true });

function dimensions(ratio) {
  if (ratio === "16:9") return [1280, 720];
  if (ratio === "1:1") return [1080, 1080];
  return [1080, 1920];
}

function cleanup(files) {
  for (const file of files || []) {
    try {
      if (file && file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch {}
  }
}

async function createPhotoSlideshow(files, options = {}) {
  if (!files || !files.length) {
    throw new Error("At least one photo is required.");
  }

  const id = crypto.randomUUID();

  const ratio = ["9:16", "16:9", "1:1"].includes(options.ratio)
    ? options.ratio
    : "9:16";

  const duration = Math.min(
    Math.max(Number(options.duration) || 3, 1),
    10
  );

  const [width, height] = dimensions(ratio);
  const output = path.join(VIDEO_DIR, `${id}.mp4`);

  const job = {
    id,
    type: "photo-slideshow",
    status: "processing",
    progress: 1,
    ratio,
    durationPerPhoto: duration,
    photos: files.length,
    createdAt: new Date().toISOString(),
    videoUrl: null,
    error: null
  };

  jobs.set(id, job);

  setImmediate(() => {
    render(id, files, output, width, height, duration);
  });

  return job;
}

function render(id, files, output, width, height, duration) {
  const job = jobs.get(id);

  if (!job) {
    cleanup(files);
    return;
  }

  /*
    Each image becomes an independent short video segment.
    concat then joins all segments into one MP4.
  */

  const args = ["-y"];

  files.forEach(file => {
    args.push(
      "-loop",
      "1",
      "-t",
      String(duration),
      "-i",
      file.path
    );
  });

  const filters = [];

  files.forEach((file, index) => {
    filters.push(
      `[${index}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p[v${index}]`
    );
  });

  const concat = files.map((_, index) => `[v${index}]`).join("");

  filters.push(
    `${concat}concat=n=${files.length}:v=1:a=0[outv]`
  );

  args.push(
    "-filter_complex",
    filters.join(";"),
    "-map",
    "[outv]",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "23",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    output
  );

  const child = spawn("ffmpeg", args);

  let stderr = "";

  child.stderr.on("data", data => {
    stderr += data.toString();

    const current = jobs.get(id);

    if (!current) return;

    /*
      FFmpeg output is not guaranteed to expose progress in exactly
      the same format on every build, so this is intentionally
      best-effort.
    */

    const match = data
      .toString()
      .match(/time=(\d+):(\d+):(\d+)\.(\d+)/);

    if (match) {
      const seconds =
        Number(match[1]) * 3600 +
        Number(match[2]) * 60 +
        Number(match[3]);

      const total = files.length * duration;

      if (total > 0) {
        current.progress = Math.min(
          96,
          Math.max(
            5,
            Math.round((seconds / total) * 95)
          )
        );
      }
    }
  });

  child.on("error", error => {
    const current = jobs.get(id);

    if (current) {
      current.status = "failed";
      current.progress = 0;
      current.error =
        "FFmpeg could not start: " + error.message;
    }

    cleanup(files);
  });

  child.on("close", code => {
    const current = jobs.get(id);

    if (!current) {
      cleanup(files);
      return;
    }

    if (code === 0 && fs.existsSync(output)) {
      current.status = "completed";
      current.progress = 100;
      current.videoUrl =
        `/media/videos/${path.basename(output)}`;
      current.completedAt =
        new Date().toISOString();
    } else {
      current.status = "failed";
      current.progress = 0;
      current.error =
        "FFmpeg failed to create the MP4 video.";

      console.error(stderr.slice(-3000));
    }

    cleanup(files);
  });
}

function getJob(id) {
  return jobs.get(id) || null;
}

function getStats() {
  const list = [...jobs.values()];

  return {
    total: list.length,
    processing: list.filter(
      x => x.status === "processing"
    ).length,
    completed: list.filter(
      x => x.status === "completed"
    ).length,
    failed: list.filter(
      x => x.status === "failed"
    ).length
  };
}

module.exports = {
  createPhotoSlideshow,
  getJob,
  getStats
};
