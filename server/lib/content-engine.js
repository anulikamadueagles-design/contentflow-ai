const platforms = {
  instagram: {
    name: "Instagram",
    style: "visual, conversational and engaging",
    hashtags: ["#Instagram", "#ContentCreator", "#SocialMedia", "#Reels"]
  },
  tiktok: {
    name: "TikTok",
    style: "fast, energetic and hook-driven",
    hashtags: ["#TikTok", "#FYP", "#Viral", "#ContentCreator"]
  },
  facebook: {
    name: "Facebook",
    style: "friendly, community-focused and easy to read",
    hashtags: ["#Facebook", "#Community", "#Business", "#SocialMedia"]
  },
  linkedin: {
    name: "LinkedIn",
    style: "professional, insightful and business-focused",
    hashtags: ["#LinkedIn", "#Business", "#Leadership", "#Growth"]
  },
  x: {
    name: "X",
    style: "short, sharp and conversation-starting",
    hashtags: ["#X", "#Business", "#Innovation"]
  },
  youtube: {
    name: "YouTube",
    style: "search-friendly, informative and story-driven",
    hashtags: ["#YouTube", "#Video", "#Creator", "#HowTo"]
  },
  pinterest: {
    name: "Pinterest",
    style: "searchable, inspirational and practical",
    hashtags: ["#Pinterest", "#Ideas", "#Inspiration", "#Tips"]
  },
  threads: {
    name: "Threads",
    style: "casual, conversational and community-oriented",
    hashtags: ["#Threads", "#Conversation", "#Creator"]
  },
  snapchat: {
    name: "Snapchat",
    style: "quick, visual and informal",
    hashtags: ["#Snapchat", "#Story", "#Creator"]
  },
  whatsapp: {
    name: "WhatsApp",
    style: "direct, personal and shareable",
    hashtags: ["#WhatsApp", "#Updates", "#Business"]
  },
  telegram: {
    name: "Telegram",
    style: "informative, direct and community-friendly",
    hashtags: ["#Telegram", "#Community", "#Updates"]
  },
  reddit: {
    name: "Reddit",
    style: "discussion-oriented, useful and non-promotional",
    hashtags: ["#Discussion", "#Tips", "#Community"]
  }
};

function clean(value, fallback = "") {
  return String(value || fallback).trim();
}

function makeHashTags(topic, platform) {
  const base = topic
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map(x => "#" + x.replace(/^\w/, c => c.toUpperCase()));

  return [...new Set([...base, ...(platforms[platform]?.hashtags || [])])].slice(0, 8);
}

function makeHook(topic, tone) {
  const hooks = [
    `What if ${topic} could completely change the way you work?`,
    `Most people are approaching ${topic} the wrong way.`,
    `Here is the simple truth about ${topic}.`,
    `Before you spend another minute on ${topic}, read this.`,
    `3 things you should know about ${topic} right now.`,
    `The easiest way to understand ${topic}.`,
    `Nobody talks enough about this part of ${topic}.`
  ];

  const index = Math.abs(
    `${topic}-${tone}`.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
  ) % hooks.length;

  return hooks[index];
}

function generateContent({ topic, platform = "instagram", tone = "professional", audience = "general audience" }) {
  topic = clean(topic, "your topic");

  const p = platforms[platform] || platforms.instagram;
  const hook = makeHook(topic, tone);

  const caption =
`${hook}

Here is the practical approach:

1. Understand the problem.
2. Focus on the result your audience actually wants.
3. Make the next step simple.
4. Keep improving from real feedback.

The goal is not to make ${topic} complicated. The goal is to make it useful for ${audience}.

What would you add to this list?`;

  const cta =
    platform === "linkedin"
      ? "What has worked for you? Share your experience in the comments."
      : platform === "tiktok"
        ? "Follow for more practical ideas and save this for later."
        : "Save this, share it with someone who needs it, and follow for more.";

  return {
    platform: p.name,
    topic,
    tone,
    audience,
    hook,
    caption,
    cta,
    hashtags: makeHashTags(topic, platform),
    contentType: platform === "youtube" ? "video" : "social post",
    recommendedFormat: platform === "youtube"
      ? "16:9 video"
      : ["instagram", "tiktok", "snapchat"].includes(platform)
        ? "9:16 vertical video"
        : "platform-native post"
  };
}

function repurpose({ source, topic, tone = "professional", audience = "general audience" }) {
  source = clean(source);
  topic = clean(topic, source ? source.slice(0, 80) : "your topic");

  const result = {};

  for (const key of Object.keys(platforms)) {
    const item = generateContent({
      topic,
      platform: key,
      tone,
      audience
    });

    const sourceLine = source
      ? `\n\nRepurposed from the original idea: ${source.slice(0, 220)}`
      : "";

    result[key] = {
      ...item,
      caption: item.caption + sourceLine,
      shortVersion: `${item.hook} ${topic} — here is the practical takeaway.`,
      videoScript: [
        `HOOK: ${item.hook}`,
        `POINT 1: Explain the main problem around ${topic}.`,
        `POINT 2: Give one practical example.`,
        `POINT 3: Show the desired result.`,
        `CTA: ${item.cta}`
      ],
      carousel: [
        `Slide 1: ${item.hook}`,
        `Slide 2: The problem`,
        `Slide 3: Why it matters`,
        `Slide 4: The practical solution`,
        `Slide 5: Example`,
        `Slide 6: Key takeaway`,
        `Slide 7: ${item.cta}`
      ]
    };
  }

  return result;
}

function calendar(topic, days = 7) {
  const count = Math.min(Math.max(Number(days) || 7, 1), 30);
  const platformsList = Object.keys(platforms);

  return Array.from({ length: count }, (_, i) => {
    const platform = platformsList[i % platformsList.length];
    const types = ["Educational", "Story", "How-to", "Behind the scenes", "List", "Opinion", "Case study"];

    return {
      day: i + 1,
      platform: platforms[platform].name,
      contentType: types[i % types.length],
      topic: `${topic} — ${types[i % types.length]}`,
      hook: makeHook(topic, "professional"),
      suggestedTime: `${9 + (i % 4)}:00`,
      status: "Planned"
    };
  });
}

module.exports = {
  platforms,
  generateContent,
  repurpose,
  calendar
};
