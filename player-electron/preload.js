const { contextBridge } = require('electron');

// Expose minimal API to browser window
contextBridge.exposeInMainWorld("playerAPI", {
  startPlayer: () => require("../player-core/dist/entry").start()
});
