// Ocean Control: Electron main process
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = process.argv.includes('--dev');
let win;

// ---- tiny JSON store in the user-data folder (saved items + settings) ----
const storeFile = () => path.join(app.getPath('userData'), 'ocean-control-store.json');

function readStore() {
  try { return JSON.parse(fs.readFileSync(storeFile(), 'utf8')); }
  catch { return {}; }
}
function writeStore(data) {
  try {
    fs.mkdirSync(path.dirname(storeFile()), { recursive: true });
    fs.writeFileSync(storeFile(), JSON.stringify(data, null, 2));
    return true;
  } catch (e) { console.error('store write failed', e); return false; }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1600,
    height: 980,
    minWidth: 1280,
    minHeight: 800,
    frame: false,
    backgroundColor: '#03070f',
    title: 'Ocean Control',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  win.once('ready-to-show', () => win.show());
  if (isDev) win.webContents.openDevTools({ mode: 'detach' });

  win.on('maximize', () => win.webContents.send('win:state', 'maximized'));
  win.on('unmaximize', () => win.webContents.send('win:state', 'normal'));
}

ipcMain.handle('store:get', () => readStore());
ipcMain.handle('store:set', (_e, data) => writeStore(data));

ipcMain.on('win:minimize', () => win && win.minimize());
ipcMain.on('win:maximize', () => {
  if (!win) return;
  win.isMaximized() ? win.unmaximize() : win.maximize();
});
ipcMain.on('win:close', () => win && win.close());

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
