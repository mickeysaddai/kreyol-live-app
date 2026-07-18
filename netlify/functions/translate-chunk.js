// POST { audio: base64String, mime: string } -> { english: string, creole: string }
//
// Uses OpenAI's Whisper /translations endpoint, which translates audio directly
// to English text in a single model call -- no separate "transcribe then translate"
// hop, which avoids compounding transcription errors into confidently-wrong English.
// A second, independent call to /transcriptions (language=ht) gets the raw Creole
// text purely for on-screen display/verification -- it is NOT used as input to the
// translation, so a rough transcript there does not affect translation quality.

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const apiKey = process.env.OPENAI_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: "Server missing OPENAI_KEY" }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const { audio, mime } = payload;
  if (!audio) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing audio field" }) };
  }

  try {
    const audioBuffer = Buffer.from(audio, "base64");
    const extension = mime && mime.includes("mp4") ? "mp4" : mime && mime.includes("aac") ? "aac" : "webm";
    const filename = `chunk.${extension}`;

    async function callWhisper(endpoint, extraFields) {
      const form = new FormData();
      form.append("file", new Blob([audioBuffer], { type: mime || "audio/webm" }), filename);
      form.append("model", "whisper-1");
      for (const [key, value] of Object.entries(extraFields || {})) {
        form.append(key, value);
      }
      const res = await fetch(`https://api.openai.com/v1/audio/${endpoint}`, {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}` },
        body: form,
      });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(`${endpoint} failed: ${detail}`);
      }
      const data = await res.json();
      return (data.text || "").trim();
    }

    // Run both calls in parallel -- they're independent of each other.
    const [english, creole] = await Promise.all([
      callWhisper("translations", {}),
      callWhisper("transcriptions", { language: "ht" }).catch(() => ""), // display-only, ok if it fails
    ]);

    return {
      statusCode: 200,
      body: JSON.stringify({ english: english || "[inaudible]", creole }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
