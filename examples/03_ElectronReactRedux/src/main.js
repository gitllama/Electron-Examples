const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const path = require('path');
const url = require('url');

var mainWindow;

app.on('ready', function() {
    mainWindow = new BrowserWindow({ width: 800, height: 600 })
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }))
    mainWindow.webContents.openDevTools()
    mainWindow.on('closed', function () {
        mainWindow = null
    });
});
app.on('window-all-closed', function() {
    if (process.platform !== 'darwin') {
        app.quit()
    }
});
app.on('activate', function() {
    if (mainWindow === null) {
        createWindow()
    }
});