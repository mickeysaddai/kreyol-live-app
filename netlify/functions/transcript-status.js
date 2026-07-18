// GET ?id=transcriptId -> { status, text, error }
// Client polls this every ~1.5s until status is "completed" or "error".
// Kept as its own fast function (not a long-running poll loop server-side)
// to stay comfortably inside Netlify's per-invocation time limits.

exports.handler = async (event) => {
  const id = event.queryStringParameters && event.queryStringParameters.id;
  if (!id) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing id query param" }) };
  }

  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: "Server missing ASSEMBLYAI_API_KEY" }) };
  }

  try {
    const res = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
      headers: { authorization: apiKey },
    });
    const data = await res.json();

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: data.status, // "queued" | "processing" | "completed" | "error"
        text: data.text || "",
        error: data.error || null,
      }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
