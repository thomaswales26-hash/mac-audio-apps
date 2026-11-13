const DEFAULTS = { enabled: true, allowlist: [], blockedCount: 0 };
const RULESET_ID = "ad_networks";
const ALLOW_RULE_ID_BASE = 100000;
const RESOURCE_TYPES = ["main_frame", "sub_frame", "stylesheet", "script", "image", "font", "object", "xmlhttprequest", "ping", "media", "websocket", "other"];
const SUSPICIOUS_URL = /(?:^|[./_-])(pop(?:up|under)?|redirect|clickad|adserver|adservice|doubleclick|trafficjunky|exoclick)(?:[./_?&=-]|$)/i;

async function settings() {
  return { ...DEFAULTS, ...(await browserApi.storage.local.get(DEFAULTS)) };
}

function hostFromUrl(value) {
  try { return new URL(value).hostname.replace(/^www\./, ""); } catch { return ""; }
}

function siteAllowed(host, allowlist) {
  return allowlist.some(item => host === item || host.endsWith(`.${item}`));
}

async function updateRuleset(enabled) {
  if (!browserApi.declarativeNetRequest?.updateEnabledRulesets) return;
  await browserApi.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds: enabled ? [RULESET_ID] : [],
    disableRulesetIds: enabled ? [] : [RULESET_ID],
  });
}

async function updateAllowRules(allowlist) {
  const existing = await browserApi.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing
    .filter(rule => rule.id >= ALLOW_RULE_ID_BASE)
    .map(rule => rule.id);
  const addRules = allowlist.slice(0, 1000).map((domain, index) => ({
    id: ALLOW_RULE_ID_BASE + index,
    priority: 100,
    action: { type: "allow" },
    condition: {
      initiatorDomains: [domain],
      resourceTypes: RESOURCE_TYPES,
    },
  }));
  await browserApi.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules });
}

async function incrementBlocked(kind) {
  const current = await settings();
  const blockedCount = current.blockedCount + 1;
  await browserApi.storage.local.set({ blockedCount, lastBlockedKind: kind, lastBlockedAt: Date.now() });
  return blockedCount;
}

const browserApi = globalThis.browser ?? globalThis.chrome;

browserApi.runtime.onInstalled.addListener(async () => {
  const current = await settings();
  await browserApi.storage.local.set(current);
  await updateRuleset(current.enabled);
  await updateAllowRules(current.allowlist);
});

browserApi.runtime.onStartup?.addListener(async () => {
  const current = await settings();
  await updateRuleset(current.enabled);
  await updateAllowRules(current.allowlist);
});

browserApi.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.enabled) void updateRuleset(changes.enabled.newValue);
  if (area === "local" && changes.allowlist) void updateAllowRules(changes.allowlist.newValue || []);
});

browserApi.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "blocked") {
    void incrementBlocked(message.kind || "content").then(blockedCount => sendResponse({ blockedCount }));
    return true;
  }
  if (message?.type === "get-page-state") {
    void settings().then(current => {
      const host = hostFromUrl(sender.tab?.url || message.url || "");
      sendResponse({ enabled: current.enabled, allowed: siteAllowed(host, current.allowlist), host });
    });
    return true;
  }
  return false;
});

// Close navigation targets that are positively identified as ad/popunder URLs.
browserApi.webNavigation?.onCreatedNavigationTarget.addListener(async details => {
  const current = await settings();
  if (!current.enabled || !SUSPICIOUS_URL.test(details.url)) return;
  const source = await browserApi.tabs.get(details.sourceTabId).catch(() => null);
  const host = hostFromUrl(source?.url || "");
  if (siteAllowed(host, current.allowlist)) return;
  await browserApi.tabs.remove(details.tabId).catch(() => {});
  await incrementBlocked("popunder");
});
