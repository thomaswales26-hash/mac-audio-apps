const api = globalThis.browser ?? globalThis.chrome;
const enabledInput = document.querySelector("#enabled");
const stateLabel = document.querySelector("#stateLabel");
const siteLabel = document.querySelector("#siteLabel");
const siteToggle = document.querySelector("#siteToggle");
const count = document.querySelector("#count");
let host = "";
let allowlist = [];

function hostname(url) { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } }
function allowed() { return allowlist.some(item => host === item || host.endsWith(`.${item}`)); }
function render(enabled) {
  enabledInput.checked = enabled;
  stateLabel.textContent = enabled ? "Protection on" : "Protection off";
  siteLabel.textContent = host || "Browser page";
  siteToggle.disabled = !host;
  siteToggle.textContent = allowed() ? "Enable protection on this site" : "Allow on this site";
}

(async () => {
  const stored = await api.storage.local.get({ enabled: true, allowlist: [], blockedCount: 0 });
  allowlist = stored.allowlist;
  count.textContent = stored.blockedCount.toLocaleString();
  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  host = hostname(tab?.url || "");
  render(stored.enabled);
})();

enabledInput.addEventListener("change", async () => {
  await api.storage.local.set({ enabled: enabledInput.checked });
  render(enabledInput.checked);
});

siteToggle.addEventListener("click", async () => {
  if (!host) return;
  allowlist = allowed() ? allowlist.filter(item => item !== host) : [...new Set([...allowlist, host])];
  await api.storage.local.set({ allowlist });
  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) await api.tabs.reload(tab.id);
  render(enabledInput.checked);
});
