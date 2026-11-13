const { app, BrowserWindow, ipcMain, Menu, shell } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const isMac = process.platform === "darwin";
const defaultSettings = {
  installedBrowsers: {
    chromium: false,
    firefox: false,
  },
};

function settingsPath() {
  return path.join(app.getPath("userData"), "settings.json");
}

function normalizeSettings(value = {}) {
  return {
    installedBrowsers: {
      ...defaultSettings.installedBrowsers,
      ...(value.installedBrowsers || {}),
    },
  };
}

function readSettings() {
  try {
    return normalizeSettings(JSON.parse(fs.readFileSync(settingsPath(), "utf8")));
  } catch {
    return { installedBrowsers: { ...defaultSettings.installedBrowsers } };
  }
}

function writeSettings(settings) {
  const normalized = normalizeSettings(settings);
  fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
  fs.writeFileSync(settingsPath(), `${JSON.stringify(normalized, null, 2)}\n`, { mode: 0o600 });
  return normalized;
}

function extensionDirectory(browser) {
  const candidates = [
    path.join(process.resourcesPath, "extensions", browser),
    path.join(__dirname, "..", "extensions", browser),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0];
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1160,
    height: 780,
    minWidth: 940,
    minHeight: 650,
    show: false,
    backgroundColor: "#0c1110",
    title: "Shieldwall",
    titleBarStyle: isMac ? "hiddenInset" : "default",
    trafficLightPosition: { x: 20, y: 19 },
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  window.loadFile(path.join(__dirname, "index.html"));
  window.once("ready-to-show", () => window.show());
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event, url) => {
    if (url !== window.webContents.getURL()) event.preventDefault();
  });
}

function installIpcHandlers() {
  ipcMain.handle("settings:get", () => readSettings());
  ipcMain.handle("settings:save", (_event, settings) => writeSettings(settings));
  ipcMain.handle("extension:reveal", (_event, browser) => {
    if (!["chromium", "firefox"].includes(browser)) return false;
    const directory = extensionDirectory(browser);
    if (!fs.existsSync(directory)) return false;
    shell.showItemInFolder(path.join(directory, "manifest.json"));
    return true;
  });
  ipcMain.handle("help:open", async (_event, browser) => {
    const urls = {
      chromium: "https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked",
      firefox: "https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/",
    };
    if (!urls[browser]) return false;
    await shell.openExternal(urls[browser]);
    return true;
  });
  ipcMain.handle("privacy:open", async () => {
    await shell.openExternal("https://github.com/thomaswales26-hash/mac-popup-blocker");
    return true;
  });
}

const menuTemplate = [
  ...(isMac
    ? [
        {
          label: app.name,
          submenu: [
            { role: "about" },
            { type: "separator" },
            { role: "hide" },
            { role: "hideOthers" },
            { role: "unhide" },
            { type: "separator" },
            { role: "quit" },
          ],
        },
      ]
    : []),
  {
    label: "Edit",
    submenu: [
      { role: "undo" },
      { role: "redo" },
      { type: "separator" },
      { role: "cut" },
      { role: "copy" },
      { role: "paste" },
      { role: "selectAll" },
    ],
  },
  {
    label: "View",
    submenu: [
      { role: "reload" },
      { role: "forceReload" },
      { type: "separator" },
      { role: "resetZoom" },
      { role: "zoomIn" },
      { role: "zoomOut" },
      { type: "separator" },
      { role: "togglefullscreen" },
    ],
  },
  {
    label: "Window",
    submenu: [{ role: "minimize" }, { role: "zoom" }, ...(isMac ? [{ role: "front" }] : [{ role: "close" }])],
  },
];

app.whenReady().then(() => {
  installIpcHandlers();
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (!isMac) app.quit();
});
