# Kreyòl → English Live Captions

Records the mic in ~10 second chunks, transcribes Haitian Creole with AssemblyAI
(their standard transcription endpoint — real-time streaming doesn't support
Creole yet), then translates each chunk to English with Claude. Captions show
up as each chunk finishes.

## Why chunks instead of true streaming

AssemblyAI's low-latency streaming API only covers English, Spanish, French,
German, Italian, and Portuguese right now. Haitian Creole is only available
on their regular (upload-and-poll) transcription endpoint, which processes a
finished audio clip in a few seconds. That's exactly why this app records in
short chunks instead of streaming continuously — it's working with what the
tools actually support today, not a workaround.

## Deploy it

1. **Push this folder to GitHub** (new repo, commit everything here).
2. **Connect it in Netlify**: New site from Git → pick the repo. Build
   settings are already defined in `netlify.toml`, so you can leave the
   build command blank and just deploy.
3. **Set environment variables** in Netlify: Site settings → Environment
   variables → add:
   - `ASSEMBLYAI_API_KEY` — from your AssemblyAI dashboard
   - `ANTHROPIC_KEY` — from console.anthropic.com (API Keys page).
     This is a different key from your claude.ai login — it's a
     pay-as-you-go API key, not a subscription. If your Netlify account
     already has this variable set from another project, you don't need
     to add it again.
4. **Redeploy** after adding the env vars (Netlify doesn't pick them up
   until the next deploy).
5. Open the live Netlify URL **on your phone**, over HTTPS (required for
   microphone access — this is why it needs to be deployed, not opened as
   a local file).

## Using it

- Tap **Start Listening**, hold the phone toward the speaker.
- Every ~10 seconds, a caption appears: pending → transcribing → translating
  → done. If a chunk was silence or noise, it just quietly disappears
  instead of showing junk.
- Tap **Stop Listening** to end the session.

## Known limits, so you're not surprised mid-event

- There's a real ~5-15 second lag between someone speaking and the caption
  appearing (record chunk → upload → transcribe → translate). It's live
  captioning, not simultaneous interpretation.
- Needs a data connection the whole time. Weak signal will slow chunks down,
  not break them — they'll just queue up and catch up.
- If a chunk fails (bad connection, API hiccup), you'll see a red error line
  for that one chunk, but recording keeps going and later chunks will still
  work.
- The 10 second chunk size is set in `public/index.html` as `CHUNK_MS` —
  change that number if you want shorter/longer chunks.

## Optional next step

You mentioned having a Supabase project — a natural next addition is logging
each chunk's Creole + English text to a Supabase table, so you'd have a full
transcript of the day afterward, and could view captions on a second device
(like a tablet at the front) synced in real time. Not built here to keep
today's version simple, but ask if you want it added.
