// POST { audio: base64String, mime: string } -> { id: transcriptId }
// Uploads raw audio to AssemblyAI and requests a Haitian Creole transcription job.
// Async endpoint is used deliberately: AssemblyAI's low-latency streaming API does
// NOT support Haitian Creole, only their standard (upload + poll) transcription does.

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: "Server missing ASSEMBLYAI_API_KEY" }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const { audio } = payload;
  if (!audio) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing audio field" }) };
  }

  try {
    const audioBuffer = Buffer.from(audio, "base64");

    // 1. Upload raw bytes to AssemblyAI's temp storage
    const uploadRes = await fetch("https://api.assemblyai.com/v2/upload", {
      method: "POST",
      headers: {
        authorization: apiKey,
        "content-type": "application/octet-stream",
      },
      body: audioBuffer,
    });

    if (!uploadRes.ok) {
      const detail = await uploadRes.text();
      return { statusCode: 502, body: JSON.stringify({ error: "AssemblyAI upload failed", detail }) };
    }
    const { upload_url } = await uploadRes.json();

    // 2. Kick off transcription job for Haitian Creole
    const transcriptRes = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        authorization: apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        audio_url: upload_url,
        language_code: "ht",
      }),
    });

    if (!transcriptRes.ok) {
      const detail = await transcriptRes.text();
      return { statusCode: 502, body: JSON.stringify({ error: "AssemblyAI transcript request failed", detail }) };
    }

    const transcriptData = await transcriptRes.json();
    return { statusCode: 200, body: JSON.stringify({ id: transcriptData.id }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
