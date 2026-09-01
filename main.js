const { app, BrowserWindow, ipcMain, screen, Menu } = require("electron");
const path = require("path");
const fs = require("fs");

app.commandLine.appendSwitch("disable-background-timer-throttling");
app.commandLine.appendSwitch("disable-renderer-backgrounding");
app.commandLine.appendSwitch("disable-gpu-vsync"); 
app.commandLine.appendSwitch("js-flags", "--max-semi-space-size=1 --optimize-for-size"); 

const settingsPath = path.join(app.getPath("userData"), "clock-settings.json");
let windows = [];

Menu.setApplicationMenu(null);

function getLaunchMode() {
  const args = process.argv.slice(1).map((arg) => String(arg).toLowerCase().trim());
  
  if (args.some(arg => arg === "/s" || arg.startsWith("/s:") || arg.startsWith("/s "))) {
    return "clock";
  }
  if (args.some(arg => arg === "/p" || arg.startsWith("/p:") || arg.startsWith("/p "))) {
    return "preview";
  }
  if (args.some(arg => arg === "/c" || arg.startsWith("/c:") || arg.startsWith("/c "))) {
    return "settings";
  }
  return "settings";
}

const mode = getLaunchMode();

if (mode === "preview") {
  app.quit();
  process.exit(0);
}

ipcMain.handle("save-settings", (event, data) => {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Failed to save settings to file:", err);
    return false;
  }
});

ipcMain.handle("load-settings", () => {
  try {
    if (fs.existsSync(settingsPath)) {
      const rawData = fs.readFileSync(settingsPath, "utf-8");
      return JSON.parse(rawData);
    }
  } catch (err) {
    console.error("Failed to load settings from file:", err);
  }
  return null;
});

function createWindows() {
  const isClockMode = mode === "clock";

  if (isClockMode) {
    const displays = screen.getAllDisplays();
    
    displays.forEach((display) => {
      const win = new BrowserWindow({
        x: display.bounds.x,
        y: display.bounds.y,
        width: display.bounds.width,
        height: display.bounds.height,
        fullscreen: true,
        frame: false,
        alwaysOnTop: true,
        backgroundColor: "#000000",
        webPreferences: {
          contextIsolation: true,
          nodeIntegration: false,
          preload: path.join(__dirname, "preload.js"),
        },
      });

      win.setAlwaysOnTop(true, "screen-saver");
      win.webContents.on("did-finish-load", () => {
        win.webContents.insertCSS("* { cursor: none !important; }");
      });

      win.loadFile(path.join(__dirname, "public", "index.html"), {
        query: { mode },
      });

      windows.push(win);

      win.on("closed", () => {
        windows.forEach((w) => {
          if (!w.isDestroyed()) {
            w.close();
          }
        });
        app.quit();
      });
    });
  } else {
  
    const win = new BrowserWindow({
      width: 1024,
      height: 768,
      frame: true,
      backgroundColor: "#000000",
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: path.join(__dirname, "preload.js"),
      },
    });

    win.loadFile(path.join(__dirname, "public", "index.html"), {
      query: { mode },
    });
    windows.push(win);
  }
}

ipcMain.on("close-app", () => {
  app.quit();
});

ipcMain.on("open-external", (event, url) => {
  const { shell } = require("electron");
  shell.openExternal(url);
});

app.whenReady().then(createWindows);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindows();
});