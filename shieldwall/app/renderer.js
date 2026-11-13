const pageDetails = {
  overview: ["Protection overview", "Good afternoon"],
  browsers: ["Browser setup", "Connect your browsers"],
  privacy: ["Privacy", "Designed to know less"],
};

let settings = null;
let toastTimer;

const byId = (id) => document.getElementById(id);

function showToast(message) {
  const toast = byId("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

async function persist() {
  settings = await window.shieldwall.saveSettings(settings);
  renderSettings();
}

function goToPage(pageName) {
  document.querySelectorAll(".page").forEach((page) => page.classList.toggle("active", page.id === pageName));
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.page === pageName));
  byId("page-eyebrow").textContent = pageDetails[pageName][0];
  byId("page-title").textContent = pageDetails[pageName][1];
}

function renderSettings() {
  document.querySelectorAll("[data-installed]").forEach((control) => {
    const browser = control.dataset.installed;
    const installed = Boolean(settings.installedBrowsers[browser]);
    control.checked = installed;
    const state = document.querySelector(`[data-browser-state="${browser}"]`);
    state.textContent = installed ? "Marked installed" : "Not marked installed";
    state.classList.toggle("done", installed);
  });
  byId("browser-count").textContent = `${Object.values(settings.installedBrowsers).filter(Boolean).length} / 2`;
}

async function initialize() {
  settings = await window.shieldwall.getSettings();
  renderSettings();

  document.querySelectorAll(".nav-item").forEach((item) => item.addEventListener("click", () => goToPage(item.dataset.page)));
  document.querySelectorAll("[data-go-page]").forEach((item) => item.addEventListener("click", () => goToPage(item.dataset.goPage)));

  document.querySelectorAll("[data-installed]").forEach((control) => {
    control.addEventListener("change", async () => {
      settings.installedBrowsers[control.dataset.installed] = control.checked;
      await persist();
      showToast("Browser setup status saved");
    });
  });

  document.querySelectorAll("[data-reveal]").forEach((button) => {
    button.addEventListener("click", async () => {
      const didReveal = await window.shieldwall.revealExtension(button.dataset.reveal);
      showToast(didReveal ? "Extension folder revealed in Finder" : "Extension folder could not be found");
    });
  });

  document.querySelectorAll("[data-help]").forEach((button) => {
    button.addEventListener("click", async () => {
      await window.shieldwall.openHelp(button.dataset.help);
    });
  });

}

initialize().catch((error) => {
  console.error(error);
  showToast("Shieldwall could not load its settings");
});
