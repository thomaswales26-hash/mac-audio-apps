# Shieldwall browser extensions

Shieldwall blocks unwanted script-opened popups, known popunder/redirect targets, intrusive ad overlays, and requests to a focused list of common advertising domains. All settings and counters stay in browser-local storage.

## Chromium browsers (Chrome, Edge, Brave, Arc)

1. Open the browser's extension management page (`chrome://extensions`, `edge://extensions`, or equivalent).
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select the `chromium` folder.
4. Pin Shieldwall from the extensions menu.

For public distribution, package and submit the same `chromium` folder to the Chrome Web Store and Microsoft Edge Add-ons. Browsers do not permit a Mac app to silently install an extension.

## Firefox

For temporary local testing, open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, and select `firefox/manifest.json`.

Permanent Firefox installation requires signing through Mozilla Add-ons. Package the contents of `firefox` as a ZIP/XPI and submit it for signing.

## Safety and limits

- Shieldwall does not decrypt HTTPS, install a root certificate, or read form values.
- The overlay heuristic deliberately avoids consent, privacy, login, checkout, and payment dialogs.
- Site allowlisting is available from the toolbar popup.
- No blocker can safely distinguish every legitimate popup from every abusive one. Shieldwall blocks script popups without a recent trusted input and positively identified ad/popunder destinations.
