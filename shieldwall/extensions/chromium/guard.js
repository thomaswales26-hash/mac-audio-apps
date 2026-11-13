(() => {
  "use strict";
  if (window.__quietWebGuardInstalled) return;
  window.__quietWebGuardInstalled = true;
  let enabled = true;
  let allowed = false;
  let lastTrustedAction = 0;
  const originalOpen = window.open.bind(window);

  addEventListener("quietweb-config", event => {
    enabled = event.detail?.enabled !== false;
    allowed = event.detail?.allowed === true;
  });
  addEventListener("pointerdown", event => { if (event.isTrusted) lastTrustedAction = Date.now(); }, true);
  addEventListener("keydown", event => { if (event.isTrusted) lastTrustedAction = Date.now(); }, true);

  window.open = function quietWebOpen(url, target, features) {
    if (!enabled || allowed || Date.now() - lastTrustedAction < 900) return originalOpen(url, target, features);
    window.postMessage({ source: "quietweb", type: "blocked-popup" }, "*");
    return null;
  };
})();
