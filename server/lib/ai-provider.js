async function generateAI({ system, user }) {
  const url = process.env.AI_API_URL;
  const key = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;

  if (!url || !key || !model) return null;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + key
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ]
    })
  });

  const body = await response.text();

  if (!response.ok) {
    throw new Error("AI provider error " + response.status + ": " + body.slice(0, 500));
  }

  const data = JSON.parse(body);

  return data?.choices?.[0]?.message?.content ||
         data?.output_text ||
         data?.text ||
         null;
}

function parseJSON(value) {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {}

  const start = String(value).indexOf("{");
  const end = String(value).lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) return null;

  try {
    return JSON.parse(String(value).slice(start, end + 1));
  } catch {
    return null;
  }
}

module.exports = { generateAI, parseJSON };
