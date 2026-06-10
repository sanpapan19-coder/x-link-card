/* eslint-disable @typescript-eslint/no-require-imports */
const { app, BrowserWindow } = require('electron');
const { spawn, execFile } = require('child_process');

const NEXT_URL = 'http://localhost:3000';
const ADMIN_URL = `${NEXT_URL}/admin`;

let mainWindow = null;
let nextProcess = null;

function startNextServer() {
  if (nextProcess) return;

  nextProcess = spawn('npm', ['run', 'dev'], {
    cwd: __dirname,
    shell: process.platform === 'win32',
    stdio: 'ignore',
    windowsHide: true,
    env: {
      ...process.env,
      BROWSER: 'none',
    },
  });

  nextProcess.unref();

  nextProcess.on('exit', () => {
    nextProcess = null;
  });
}

async function waitForNextServer(timeoutMs = 60000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(NEXT_URL);
      if (response.ok || response.status < 500) {
        return;
      }
    } catch {
      // Server is not ready yet.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error('Next.js development server did not become ready within 60 seconds.');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: 'X画像リンクカード生成ツール',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(ADMIN_URL);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function stopNextServer() {
  if (!nextProcess) return;

  if (process.platform === 'win32' && nextProcess.pid) {
    execFile('taskkill', ['/pid', String(nextProcess.pid), '/T', '/F'], () => {});
  } else {
    nextProcess.kill();
  }

  nextProcess = null;
}

app.whenReady().then(async () => {
  startNextServer();
  await waitForNextServer();
  createWindow();
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    startNextServer();
    await waitForNextServer();
    createWindow();
  }
});

app.on('window-all-closed', () => {
  stopNextServer();

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopNextServer();
});
