// Receives one recorded audio chunk from the page (base64 JSON) and sends it
// to OpenAI twice, in parallel:
//   /audio/translations   -> English text (what the caption shows)
//   /audio/transcriptions -> raw Kreyòl text (shown dimmed, for spot-checking)
// The OpenAI key lives only here, in the OPENAI_KEY env var set in Netlify.

const OPENAI_URL = 'https://api.openai.com/v1/audio';

// Whisper sometimes "hears" these stock phrases in silence or background noise.
const SILENCE_HALLUCINATIONS = [
  'thank you', 'thank you.', 'thanks for watching', 'thanks for watching!',
  'thank you for watching', 'thank you for watching.', 'you', 'bye', 'bye.',
  'mèsi', 'mèsi.', 'merci', 'merci.'
];

function json(statusCode, body){
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  };
}

// OpenAI picks the decoder from the file extension, so it must match the format.
function extensionFor(mime){
  const m = (mime || '').toLowerCase();
  if(m.includes('webm')) return 'webm';
  if(m.includes('mp4') || m.includes('aac') || m.includes('m4a')) return 'mp4';
  if(m.includes('ogg')) return 'ogg';
  if(m.includes('wav')) return 'wav';
  if(m.includes('mpeg') || m.includes('mp3')) return 'mp3';
  return 'webm';
}

async function callWhisper(endpoint, audio, mime, fields){
  const form = new FormData();
  form.append('file', new Blob([audio], { type: mime }), 'chunk.' + extensionFor(mime));
  form.append('model', 'whisper-1');
  form.append('temperature', '0');
  for(const [k, v] of Object.entries(fields || {})) form.append(k, v);

  const res = await fetch(`${OPENAI_URL}/${endpoint}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.OPENAI_KEY}` },
    body: form
  });
  const data = await res.json().catch(() => ({}));
  if(!res.ok){
    const msg = (data.error && data.error.message) || `OpenAI ${endpoint} failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return (data.text || '').trim();
}

async function transcribeCreole(audio, mime){
  try{
    return await callWhisper('transcriptions', audio, mime, { language: 'ht' });
  }catch(err){
    // If the API ever rejects the language hint, fall back to auto-detect.
    if(err.status === 400) return callWhisper('transcriptions', audio, mime);
    throw err;
  }
}

function looksLikeSilence(text){
  const t = text.trim().toLowerCase();
  return !t || SILENCE_HALLUCINATIONS.includes(t);
}

exports.handler = async (event) => {
  if(event.httpMethod !== 'POST') return json(405, { error: 'Use POST' });
  if(!process.env.OPENAI_KEY){
    return json(500, { error: 'OPENAI_KEY is not set in Netlify environment variables' });
  }

  let payload;
  try{
    payload = JSON.parse(event.body || '{}');
  }catch(e){
    return json(400, { error: 'Body must be JSON' });
  }
  if(!payload.audio) return json(400, { error: 'Missing audio' });

  const mime = (payload.mime || 'audio/webm').split(';')[0];
  const audio = Buffer.from(payload.audio, 'base64');

  // English is required; the Kreyòl line is a bonus, so its failure is not fatal.
  const [english, creole] = await Promise.allSettled([
    callWhisper('translations', audio, mime),
    transcribeCreole(audio, mime)
  ]);

  if(english.status === 'rejected'){
    return json(502, { error: english.reason.message });
  }

  const text = english.value;
  return json(200, {
    english: looksLikeSilence(text) ? '[inaudible]' : text,
    creole: creole.status === 'fulfilled' ? creole.value : ''
  });
};
