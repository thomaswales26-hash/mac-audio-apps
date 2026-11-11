# Soundcard Recorder & Dance Box Radio — app showcase site

The download page for two native macOS apps:

- **Soundcard Recorder** — records your Mac's system audio to MP3, AAC, FLAC or ALAC, never the microphone.
- **Dance Box Radio** — 535 live dance radio stations from 98 countries, with a one-click recorder.

**Live:** https://thomaswales26-hash.github.io/mac-audio-apps/

## How it is published

GitHub Pages serves this repository's `main` branch from the root:

- `index.html` — the page
- `img/` — app icons
- `downloads/` — the two DMG installers
- `.nojekyll` — tells Pages to serve the files as they are instead of running
  them through Jekyll

To update the site, change the files, commit and push to `main`. Pages rebuilds
in under a minute.

## Local preview

```bash
./server/site.sh start     # http://localhost:8080 and http://<your-lan-ip>:8080
./server/site.sh stop
```

The Apache config in `server/` serves this folder on your own Wi-Fi; see
`server/README.md`. `server/` is not part of the published page.

## Requirements

- Soundcard Recorder: macOS 14.2 or newer.
- Dance Box Radio: macOS 14.4 or newer, Apple silicon (arm64).

Neither app opens the microphone. Both are ad-hoc signed rather than notarised, so
the first launch on another Mac may need right-click ▸ Open.
