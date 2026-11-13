(() => {
  "use strict";
  const api = globalThis.browser ?? globalThis.chrome;
  const host = location.hostname.replace(/^www\./, "");
  let enabled = true;
  let allowed = false;
  let scanQueued = false;
  const AD_WORDS = /\b(advert|sponsor|promotion|pop-?up|interstitial|subscribe now|continue to site)\b/i;
  const SAFE_WORDS = /\b(cookie|privacy|consent|sign in|log in|checkout|payment|two-factor)\b/i;

  function report(kind) {
    try { api.runtime.sendMessage({ type: "blocked", kind }); } catch {}
  }

  const guard = document.createElement("script");
  guard.src = api.runtime.getURL("guard.js");
  guard.async = false;
  guard.addEventListener("load", () => guard.remove(), { once: true });
  (document.documentElement || document.head).appendChild(guard);

  window.addEventListener("message", event => {
    if (event.source === window && event.data?.source === "quietweb" && event.data?.type === "blocked-popup") report("popup");
  });

  function isCrossOriginAdFrame(element) {
    const frame = element.matches?.("iframe") ? element : element.querySelector?.("iframe");
    if (!frame?.src) return false;
    try {
      const frameUrl = new URL(frame.src, location.href);
      return frameUrl.origin !== location.origin && AD_WORDS.test(`${frameUrl.hostname} ${frameUrl.pathname}`);
    } catch { return false; }
  }

  function candidateLooksLikeAd(element) {
    if (!(element instanceof HTMLElement) || element.dataset.quietwebChecked === "1") return false;
    element.dataset.quietwebChecked = "1";
    const style = getComputedStyle(element);
    if (style.position !== "fixed" && style.position !== "sticky") return false;
    const z = Number.parseInt(style.zIndex, 10);
    if (!Number.isFinite(z) || z < 100) return false;
    const rect = element.getBoundingClientRect();
    const coverage = (Math.max(0, rect.width) * Math.max(0, rect.height)) / Math.max(1, innerWidth * innerHeight);
    if (coverage < 0.28) return false;
    const text = (element.innerText || element.getAttribute("aria-label") || "").slice(0, 900);
    if (SAFE_WORDS.test(text)) return false;
    const hasAdSignal = AD_WORDS.test(text) || isCrossOriginAdFrame(element) || /ad[sx]?[-_ ]?(overlay|modal|popup|interstitial)/i.test(element.id + " " + element.className);
    if (!hasAdSignal) return false;
    const closeControl = element.querySelector('button,[role="button"],[aria-label*="close" i],.close,[class*="close" i]');
    return Boolean(closeControl || isCrossOriginAdFrame(element));
  }

  function removeAdOverlays() {
    if (!enabled || allowed || document.visibilityState === "hidden") return;
    let removed = 0;
    for (const element of document.querySelectorAll("body *")) {
      if (candidateLooksLikeAd(element)) {
        element.remove();
        removed += 1;
      }
    }
    if (removed) {
      const bodyStyle = getComputedStyle(document.body);
      if (bodyStyle.overflow === "hidden") document.body.style.setProperty("overflow", "auto", "important");
      report("overlay");
    }
  }

  function queueScan() {
    if (scanQueued) return;
    scanQueued = true;
    setTimeout(() => { scanQueued = false; removeAdOverlays(); }, 350);
  }

  function applyPageState(response) {
    enabled = response?.enabled !== false;
    allowed = response?.allowed === true;
    window.dispatchEvent(new CustomEvent("quietweb-config", { detail: { enabled, allowed } }));
    if (enabled && !allowed) queueScan();
  }
  if (globalThis.browser) {
    api.runtime.sendMessage({ type: "get-page-state", url: location.href }).then(applyPageState).catch(() => {});
  } else {
    api.runtime.sendMessage({ type: "get-page-state", url: location.href }, response => {
      if (!api.runtime.lastError) applyPageState(response);
    });
  }

  const observer = new MutationObserver(queueScan);
  if (document.documentElement) observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("DOMContentLoaded", queueScan, { once: true });
})();
