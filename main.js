const { app, BrowserWindow, ipcMain } = require('electron')
const audio = require('./js/audio');

function createWindow () {
	const win = new BrowserWindow({
		width: 1920,
		height: 1080,
		webPreferences: {
			nodeIntegration: true,
			devTools: true
		}
	})

	win.loadFile('index.html')
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit()
	}else{
		audio.stop();
	}
})

app.on('activate', () => {
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow()
	}
})

//audio stuff
ipcMain.on('asynMessage', function(event, args){
	if(args == 'stop'){
		audio.stop();
	}else{
		audio.start(JSON.parse(args));
	}
});
