const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    fullscreen: true,
    frame: false,
    kiosk: false,   // later we set this true for production
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js")
    }
  });

  win.loadFile("index.html");
}

app.whenReady().then(() => {
  createWindow();
});
