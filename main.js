const { app, BrowserWindow, ipcMain } = require("electron/main");
const path = require("node:path");
const crypto = require("crypto");
const os = require("os");
const { RtAudio, RtAudioApi } = require("audify");
const Store = require("electron-store");
const { fork } = require("child_process");

// Initialize persistent storage
const store = new Store();

// Global variables
let mainWindow; // Main application window
let networkInterfaces = []; // List of available network interfaces
let currentNetworkInterface = store.get("interface");
let persistentData = store.get("persistentData", {
	settings: {
		bufferSize: 16,
		bufferEnabled: true,
		hideUnsupported: true,
		sdpDeleteTimeout: 300,
		sidebarCollapsed: false,
	},
});
let currentAudioDevice = null;
let audioAPI = RtAudioApi.UNSPECIFIED;
let isSDPInitialized = false;
let streamsHash;

// Set audio API based on the operating system
switch (process.platform) {
	case "darwin":
		audioAPI = RtAudioApi.MACOSX_CORE;
		break;
	case "win32":
		audioAPI = RtAudioApi.WINDOWS_WASAPI;
		break;
	case "linux":
		audioAPI = RtAudioApi.LINUX_ALSA;
		break;
}

// Initialize RtAudio with the chosen API
const rtAudio = new RtAudio(audioAPI);

// Spawn child processes for SDP and Audio functionalities
const sdpProcess = fork(path.join(__dirname, "./src/lib/sdp.js"));
const audioProcess = fork(path.join(__dirname, "./src/lib/audio.js"));

/**
 * Creates and configures the main application window.
 */
function createMainWindow() {
	mainWindow = new BrowserWindow({
		width: 1920,
		height: 1080,
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			devTools: !app.isPackaged,
		},
	});

	// Load file or URL depending on whether the app is packaged
	if (app.isPackaged) {
		mainWindow.loadFile("./dist/index.html");
		// Disable refresh shortcuts in packaged mode
		mainWindow.webContents.on("before-input-event", (event, input) => {
			if (
				(input.key.toLowerCase() === "r" && (input.control || input.meta)) ||
				input.key === "F5"
			) {
				event.preventDefault();
			}
		});
	} else {
		mainWindow.loadURL("http://localhost:8888");
	}

	// Handle IPC messages from the renderer process
	ipcMain.on("recv-message", (event, message) => {
		handleIpcMessage(message);
	});
}

/**
 * Handles incoming IPC messages from the renderer.
 * @param {Object} message - The message object from the renderer.
 */
function handleIpcMessage(message) {
	switch (message.type) {
		case "update":
			updateSystem();
			sendMessage("updatePersistentData", persistentData);
			break;
		case "setAudioInterface":
			setAudioInterface(message.data);
			break;
		case "restart":
			refreshCurrentAudioInterface();
			audioProcess.send({
				type: "restart",
				data: {
					networkInterface: currentNetworkInterface.address,
					selected: currentAudioDevice,
				},
			});
			break;
		case "play":
			refreshCurrentAudioInterface();
			var playArgs = {
				...message.data,
				audioAPI: audioAPI,
				networkInterface: currentNetworkInterface.address,
				selected: currentAudioDevice,
			};
			audioProcess.send({ type: "start", data: playArgs });
			break;
		case "stop":
			audioProcess.send({ type: "stop" });
			break;
		case "addStream":
			sdpProcess.send({ type: "add", data: message.data });
			break;
		case "delete":
			sdpProcess.send({ type: "delete", data: message.data });
			break;
		case "setNetwork":
			if (currentNetworkInterface.address != message.data) {
				console.log("Got new network interface", message.data);
				currentNetworkInterface.address = message.data;
				updateNetworkInterfaces();
				store.set("interface", currentNetworkInterface);
				audioProcess.send({ type: "stop" });
				sdpProcess.send({
					type: "interface",
					data: currentNetworkInterface.address,
				});
			}
			break;
		case "save":
			persistentData[message.key] = JSON.parse(message.data);
			store.set("persistentData", persistentData);

			if (message.key == "settings") {
				sdpProcess.send({
					type: "deleteTimeout",
					data: persistentData.settings.sdpDeleteTimeout,
				});
			}

			break;
		default:
			console.log("Unknown IPC message type:", message.type, message.data);
	}
}

/**
 * Sends a message to the renderer process.
 * @param {string} type - The message type.
 * @param {*} data - The message payload.
 */
function sendMessage(type, data) {
	if (mainWindow) {
		try {
			mainWindow.webContents.send("send-message", { type, data });
		} catch (error) {
			console.error("Error sending message:", error);
		}
	}
}

/**
 * Sends a log message to the renderer process.
 * @param {string} logMessage - The log message.
 */
function sendLog(logMessage) {
	sendMessage("log", logMessage);
}

/**
 * Scans and updates the available network interfaces.
 */
function updateNetworkInterfaces() {
	const interfaces = os.networkInterfaces();
	const addresses = [];

	// Iterate over each interface and collect valid IPv4 addresses (exclude localhost)
	for (const interfaceName of Object.keys(interfaces)) {
		const iface = interfaces[interfaceName];
		for (const addr of iface) {
			if (addr.family === "IPv4" && addr.address !== "127.0.0.1") {
				addr.name = interfaceName;
				addresses.push(addr);
			}
		}
	}

	// Check if the stored network interface is still available
	if (currentNetworkInterface) {
		let found = false;
		for (const addr of addresses) {
			if (addr.address === currentNetworkInterface.address) {
				found = true;
				addr.isCurrent = true;
			} else {
				addr.isCurrent = false;
			}
		}
		if (!found && addresses.length > 0) {
			console.log("Network interface changed");
			currentNetworkInterface = addresses[0];
			addresses[0].isCurrent = true;
			store.set("interface", currentNetworkInterface);
			audioProcess.send({ type: "stop" });
			sdpProcess.send({
				type: "interface",
				data: currentNetworkInterface.address,
			});
		} else if (!found) {
			console.error("No Network interfaces found");
		}
	} else if (addresses.length > 0) {
		currentNetworkInterface = addresses[0];
	} else {
		console.error("No Network interfaces found");
	}

	networkInterfaces = addresses;
}

/**
 * Updates the list of audio devices and sends it to the renderer.
 */
function updateAudioInterfaces() {
	let devices = rtAudio.getDevices();

	// Mark the current audio device and filter out devices without channels
	for (let i = 0; i < devices.length; i++) {
		devices[i].isCurrent =
			currentAudioDevice && devices[i].id === currentAudioDevice.id;
		if (devices[i].inputChannels === 0 && devices[i].outputChannels === 0) {
			devices.splice(i, 1);
			i--;
		}
	}
	sendMessage("audioDevices", devices);
}

/**
 * Sets the current audio interface based on the provided device.
 * @param {Object} device - The audio device to set as current.
 */
function setAudioInterface(device) {
	const devices = rtAudio.getDevices();
	let defaultOutputDevice = null;
	let found = false;

	// Find a matching device or use the default output device
	for (const dev of devices) {
		if (
			device &&
			dev.name === device.name &&
			dev.inputChannels === device.inputChannels &&
			dev.outputChannels === device.outputChannels
		) {
			currentAudioDevice = dev;
			found = true;
			break;
		}
		if (dev.isDefaultOutput) {
			defaultOutputDevice = dev;
		}
	}

	if (!found) {
		console.log("Setting current device to default device");
		currentAudioDevice = defaultOutputDevice;
	}

	store.set("audioInterface", currentAudioDevice);
	updateAudioInterfaces();
}

/**
 * Refreshes the current audio interface.
 */
function refreshCurrentAudioInterface() {
	setAudioInterface(currentAudioDevice);
}

/**
 * Updates the system settings, network interfaces, and initializes SDP if necessary.
 */
function updateSystem() {
	updateNetworkInterfaces();
	refreshCurrentAudioInterface();

	if (!isSDPInitialized) {
		console.log("SDP is not yet initialized");
		sendLog("SDP is not yet initialized");

		isSDPInitialized = true;
		sdpProcess.send({
			type: "init",
			data: currentNetworkInterface.address,
		});
		sdpProcess.send({
			type: "deleteTimeout",
			data: persistentData.settings.sdpDeleteTimeout,
		});
		store.set("interface", currentNetworkInterface);
		console.log(
			"Init SDP",
			currentNetworkInterface.name,
			currentNetworkInterface.address
		);

		const storedStreams = store.get("streams");
		if (storedStreams) {
			for (const stream of storedStreams) {
				if (stream.manual) {
					console.log("Loading stream", stream.name);
					sdpProcess.send({
						type: "add",
						data: {
							sdp: stream.raw,
							announce: stream.announce,
						},
					});
				}
			}
		}
	}

	sendMessage("interfaces", networkInterfaces);
}

// Handle messages from the SDP child process
sdpProcess.on("message", (data) => {
	sendMessage("streams", data);

	// Combine raw stream data for hashing
	const combinedRaw = data
		.map((stream) => (stream.manual ? stream.raw : ""))
		.join("");
	const newHash = crypto.createHash("sha256").update(combinedRaw).digest("hex");

	if (newHash !== streamsHash) {
		console.log("Saving streams");
		streamsHash = newHash;
		store.set("streams", data);
	}
});

// Initialize the application when ready
app.whenReady().then(() => {
	createMainWindow();

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createMainWindow();
		}
	});
});

// Handle application shutdown: kill child processes and quit app
app.on("window-all-closed", () => {
	sdpProcess.kill();
	audioProcess.kill();
	app.quit();
});

// Initialize audio interface from stored configuration and start periodic updates
setAudioInterface(store.get("audioInterface"));
setInterval(updateSystem, 500);
