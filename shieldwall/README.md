# Shieldwall

Shieldwall is a privacy-first popup and ad blocker for macOS. It combines a native desktop controller with browser extensions for Chromium-based browsers and Firefox.

## What it blocks

- Scripted popup and pop-under windows
- Forced redirects to known advertising and tracking hosts
- Full-page click-capture overlays and common fake-close layers
- Requests to a curated list of advertising, tracking, and malicious redirect domains

## Privacy

Shieldwall performs blocking locally. It does not proxy HTTPS traffic, install a root certificate, collect browsing history, or send telemetry.

## Install

1. Download the DMG or PKG for your Mac architecture from Releases.
2. Install Shieldwall in Applications.
3. Open Shieldwall and choose your browser.
4. Follow the browser-specific instructions to load the bundled extension.

Browser security rules do not allow a desktop app to silently install an extension. Chrome and Edge require enabling Developer mode for an unpacked extension. Firefox development builds can load the bundled extension temporarily; permanent public installation requires Mozilla signing.

## Development

```bash
pnpm install
pnpm check
pnpm start
```

Build macOS packages on macOS:

```bash
pnpm package:mac:arm64
pnpm package:mac:x64
```

## Legal use

Use Shieldwall to control advertising and unwanted popups on devices and browser profiles you own or administer. Site owners may rely on advertising for funding; use allowlisting when you want to support a site.

## License

MIT
