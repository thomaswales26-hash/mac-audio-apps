# Soundcard Recorder & Dance Box Radio — app showcase site

The download page for two native macOS apps:

- **Soundcard Recorder** — records your Mac's system audio to MP3, AAC, FLAC or ALAC, never the microphone.
- **Dance Box Radio** — 535 live dance radio stations from 98 countries, with a one-click recorder.

Published with GitHub Pages from `docs/`.

## Local preview

```bash
./server/site.sh start     # http://localhost:8080 and http://<your-lan-ip>:8080
./server/site.sh stop
```

or just open `docs/index.html` in a browser.

## Structure

```
docs/              the published site (GitHub Pages serves this folder)
  index.html
  img/             app icons
  downloads/       the two DMG installers
site/              working copy of the same site
server/            optional local Apache setup for serving it on your LAN
```

## Requirements

- Soundcard Recorder: macOS 14.2 or newer.
- Dance Box Radio: macOS 14.4 or newer, Apple silicon (arm64).

Neither app opens the microphone. Both are ad-hoc signed rather than notarised, so
the first launch on another Mac may need right-click ▸ Open.
