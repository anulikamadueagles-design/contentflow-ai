(function () {
  "use strict";

  const state = {
    jobId: null,
    timer: null
  };

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setStatus(message, type) {
    const el = $("cf-ai-status");

    if (!el) return;

    el.className = "cf-ai-status";

    if (type) {
      el.classList.add(type);
    }

    el.textContent = message;
  }

  async function api(url, options) {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...(options && options.headers ? options.headers : {})
      },
      ...(options || {})
    });

    const data = await response.json().catch(() => ({
      ok: false,
      error: "Invalid server response."
    }));

    if (!response.ok || data.ok === false) {
      throw new Error(
        data.error ||
        data.message ||
        `Request failed with HTTP ${response.status}`
      );
    }

    return data;
  }

  function selectedProvider() {
    return $("cf-ai-provider").value;
  }

  async function loadProviderStatus() {
    try {
      const data = await api("/api/ai-video/status");

      const magic = $("cf-badge-magic");
      const pixazo = $("cf-badge-pixazo");

      if (data.providers.magicHour.enabled) {
        magic.textContent = "Magic Hour • READY";
        magic.classList.add("active");
      } else {
        magic.textContent = "Magic Hour • Render key needed";
      }

      if (data.providers.pixazo.enabled) {
        pixazo.textContent = "Pixazo • READY";
        pixazo.classList.add("active");
      } else {
        pixazo.textContent = "Pixazo • Render key needed";
      }
    } catch (error) {
      setStatus("Provider status could not be loaded: " + error.message, "error");
    }
  }

  function renderJobs(jobs) {
    const box = $("cf-ai-jobs");

    if (!box) return;

    if (!jobs || !jobs.length) {
      box.innerHTML =
        '<div style="color:#71869a;font-size:12px;">No AI video jobs yet.</div>';
      return;
    }

    box.innerHTML = jobs
      .slice(0, 8)
      .map(function (job) {
        const provider =
          job.provider === "pixazo"
            ? "PIXAZO"
            : "MAGIC HOUR";

        return `
          <div class="cf-ai-job">
            <div class="cf-ai-job-top">
              <span class="cf-ai-job-provider">${provider}</span>
              <span class="cf-ai-job-status">${escapeHtml(
                job.status
              )}</span>
            </div>
            <div class="cf-ai-job-prompt">${escapeHtml(
              job.prompt
            )}</div>
          </div>
        `;
      })
      .join("");
  }

  async function refreshJobs() {
    try {
      const data = await api("/api/ai-video/jobs");
      renderJobs(data.jobs);
    } catch (_) {}
  }

  async function pollJob(jobId) {
    try {
      const data = await api(
        "/api/ai-video/jobs/" +
          encodeURIComponent(jobId)
      );

      const job = data.job;

      if (job.status === "completed") {
        clearInterval(state.timer);
        state.timer = null;

        $("cf-ai-generate").disabled = false;

        setStatus(
          "Video generated successfully with " +
            (job.provider === "pixazo"
              ? "Pixazo."
              : "Magic Hour."),
          "success"
        );

        if (job.videoUrl) {
          const video = $("cf-ai-video");

          video.src = job.videoUrl;
          video.classList.add("show");

          const download = $("cf-ai-download");
          download.href = job.videoUrl;
          download.download = "contentflow-ai-video.mp4";
          download.classList.add("show");
        }

        await refreshJobs();
        return;
      }

      if (job.status === "failed") {
        clearInterval(state.timer);
        state.timer = null;

        $("cf-ai-generate").disabled = false;

        setStatus(
          job.error || "Video generation failed.",
          "error"
        );

        await refreshJobs();
        return;
      }

      setStatus(
        (job.provider === "pixazo"
          ? "Pixazo"
          : "Magic Hour") +
          " is generating your video… " +
          (job.providerStatus
            ? "[" + job.providerStatus + "]"
            : ""),
        null
      );

      await refreshJobs();
    } catch (error) {
      setStatus(error.message, "error");
    }
  }

  async function generate() {
    const prompt = $("cf-ai-prompt").value.trim();
    const provider = selectedProvider();
    const duration = Number($("cf-ai-duration").value);
    const orientation = $("cf-ai-orientation").value;
    const resolution = $("cf-ai-resolution").value;
    const model = $("cf-ai-model").value;

    if (!prompt) {
      setStatus("Describe the video you want to create.", "error");
      $("cf-ai-prompt").focus();
      return;
    }

    const button = $("cf-ai-generate");

    button.disabled = true;

    $("cf-ai-video").classList.remove("show");
    $("cf-ai-download").classList.remove("show");

    setStatus(
      "Submitting your video to " +
        (provider === "pixazo"
          ? "Pixazo"
          : "Magic Hour") +
        "…"
    );

    try {
      const data = await api("/api/ai-video/generate", {
        method: "POST",
        body: JSON.stringify({
          provider,
          prompt,
          duration,
          orientation,
          resolution,
          model,
          name: "ContentFlow AI — " + new Date().toLocaleString()
        })
      });

      state.jobId = data.job.id;

      setStatus(
        "Generation started. ContentFlow AI is waiting for the finished video…"
      );

      clearInterval(state.timer);

      state.timer = setInterval(function () {
        pollJob(state.jobId);
      }, 5000);

      await pollJob(state.jobId);
    } catch (error) {
      button.disabled = false;
      setStatus(error.message, "error");
    }
  }

  function install() {
    if (!$("contentflow-ai-video")) {
      return;
    }

    $("cf-ai-generate").addEventListener(
      "click",
      generate
    );

    $("cf-ai-provider").addEventListener(
      "change",
      function () {
        const provider = selectedProvider();

        const model = $("cf-ai-model");

        if (provider === "pixazo") {
          model.value = "default";
        }
      }
    );

    loadProviderStatus();
    refreshJobs();

    setInterval(function () {
      loadProviderStatus();
      refreshJobs();
    }, 30000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install);
  } else {
    install();
  }
})();
