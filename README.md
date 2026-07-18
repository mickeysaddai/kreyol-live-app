# Kreyòl → English Live Captions

Records the mic in ~10 second chunks and sends each one to OpenAI's Whisper
API, which translates Haitian Creole audio directly to English text in a
single step. A caption appears as each chunk finishes.

## Why one step instead of two

Earlier versions of this app transcribed Creole audio to Creole text with one
service, then translated that text to English with a separate AI call. That
two-hop approach let errors compound: if the transcription step mangled a
sentence, the translation step would confidently "smooth" the garbled text
into fluent-sounding English that didn't actually reflect what was said.

Whisper's `/translations` endpoint translates audio to English directly,
with no intermediate text to go wrong. A second, independent call to
`/transcriptions` also grabs the raw Creole text purely for on-screen
display (so you can sanity-check what it heard) — but that transcript isn't
what gets translated, so its quality doesn't affect the English you see.

## Why chunks instead of true streaming

OpenAI's low-latency realtime/streaming voice API doesn't yet support
Haitian Creole as an input language for continuous streaming. The
`/translations` and `/transcriptions` endpoints that do support Creole work
on finished audio clips, processed in a few seconds each — which is exactly
why this app records in short chunks instead of streaming continuously.

## Deploy it

1. **Push this folder to GitHub** (new repo, commit everything here).
2. **Connect it in Netlify**: New site from Git → pick the repo. Build
   settings are already defined in `netlify.toml`, so you can leave the
   build command blank and just deploy.
3. **Set the environment variable** in Netlify: Site settings → Environment
   variables → add `OPENAI_KEY` with your OpenAI API key (from
   platform.openai.com). If your Netlify account already has this saved
   from another project, you can reuse it — Whisper access comes with any
   standard OpenAI API key.
4. **Redeploy** after adding the env var (Netlify doesn't pick it up until
   the next deploy).
5. Open the live Netlify URL **on your phone**, over HTTPS (required for
   microphone access — this is why it needs to be deployed, not opened as
   a local file).

## Using it

- Tap **Start Listening**, hold the phone toward the speaker.
- Every ~10 seconds, a caption appears: pending → translating → done. If a
  chunk was silence or noise, it just quietly disappears instead of showing
  junk.
- The dimmer italic line under each caption is the raw Creole Whisper heard
  — useful for spot-checking accuracy against what was actually said.
- Tap **Stop Listening** to end the session.

## Known limits, so you're not surprised mid-event

- There's a real ~5-10 second lag between someone speaking and the caption
  appearing (record chunk → upload → translate). It's live captioning, not
  simultaneous interpretation.
- Needs a data connection the whole time. Weak signal will slow chunks down,
  not break them — they'll just queue up and catch up.
- If a chunk fails (bad connection, API hiccup), you'll see a red error line
  for that one chunk, but recording keeps going and later chunks will still
  work.
- The 10 second chunk size is set in `public/index.html` as `CHUNK_MS` —
  change that number if you want shorter/longer chunks.
- Whisper's Haitian Creole support, while real, is still a lower-resource
  language for it compared to major world languages — expect occasional
  rough patches, especially with background noise, crosstalk, or fast
  speech. Holding the phone close to the speaker or a PA feed helps.

## Optional next step

You mentioned having a Supabase project — a natural next addition is logging
each chunk's Creole + English text to a Supabase table, so you'd have a full
transcript of the day afterward, and could view captions on a second device
(like a tablet at the front) synced in real time. Not built here to keep
today's version simple, but ask if you want it added.
