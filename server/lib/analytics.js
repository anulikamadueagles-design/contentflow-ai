const fs = require("fs");
const path = require("path");

const DIR = path.join(process.cwd(), "storage", "analytics");
const FILE = path.join(DIR, "stats.json");

const defaults = {
  contentCreated: 0,
  videosCreated: 0,
  repurposedKits: 0,
  scheduledPosts: 0
};

fs.mkdirSync(DIR, { recursive: true });

function load() {
  try {
    if (!fs.existsSync(FILE)) return { ...defaults };

    const data = JSON.parse(fs.readFileSync(FILE, "utf8"));

    return {
      ...defaults,
      ...data
    };
  } catch {
    return { ...defaults };
  }
}

let stats = load();

function save() {
  try {
    fs.writeFileSync(FILE, JSON.stringify(stats, null, 2));
  } catch (error) {
    console.error("Analytics save failed:", error.message);
  }
}

function increment(field, amount = 1) {
  if (!(field in defaults)) return stats;

  stats[field] += Number(amount) || 0;
  save();

  return { ...stats };
}

function getStats() {
  return { ...stats };
}

function resetStats() {
  stats = { ...defaults };
  save();

  return { ...stats };
}

module.exports = {
  increment,
  getStats,
  resetStats
};
