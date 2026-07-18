// POST { text: string } -> { english: string }
// Translates a raw Haitian Creole transcript chunk into natural spoken English.

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const apiKey = process.env.ANTHROPIC_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: "Server missing ANTHROPIC_KEY" }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const text = (payload.text || "").trim();
  if (!text) {
    return { statusCode: 200, body: JSON.stringify({ english: "" }) };
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 400,
        system:
          "You are a live speech translator at a Haitian Creole convention. " +
          "You'll receive a raw, possibly imperfect transcript of spoken Haitian Creole " +
          "(it may contain recognition errors or run-on phrasing). Translate the MEANING " +
          "into natural, fluent spoken English, as if captioning it live for someone in the room. " +
          "Output ONLY the English translation, nothing else, no notes or preamble. " +
          "If the text is empty, garbled beyond recognition, or not real speech, output exactly: [inaudible]",
        messages: [{ role: "user", content: text }],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return { statusCode: 502, body: JSON.stringify({ error: "Translation request failed", detail }) };
    }

    const data = await res.json();
    const english = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join(" ")
      .trim();

    return { statusCode: 200, body: JSON.stringify({ english: english || "[inaudible]" }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
