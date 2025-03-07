const { contextBridge, ipcRenderer } = require("electron/renderer");

contextBridge.exposeInMainWorld("electronAPI", {
	recvMessage: (callback) =>
		ipcRenderer.on("send-message", (_event, value) => callback(value)),
	sendMessage: (message) => ipcRenderer.send("recv-message", message),
});
