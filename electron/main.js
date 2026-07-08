const { app, BrowserWindow, Menu, shell, dialog, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

let mainWindow = null;
let staticServer = null;
const PORT = 18765; // Random high port to avoid conflicts

// Simple static file server serving the exported Next.js site
function startStaticServer() {
  return new Promise((resolve, reject) => {
    const staticDir = app.isPackaged
      ? path.join(process.resourcesPath, 'static')
      : path.join(__dirname, '..', 'out');

    console.log('[Electron] Serving static files from:', staticDir);

    if (!fs.existsSync(staticDir)) {
      console.error('[Electron] Static directory NOT FOUND:', staticDir);
      reject(new Error('Static directory not found'));
      return;
    }

    const MIME_TYPES = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.eot': 'application/vnd.ms-fontobject',
      '.map': 'application/json',
      '.txt': 'text/plain; charset=utf-8',
      '.xml': 'application/xml',
      '.webp': 'image/webp',
    };

    staticServer = http.createServer((req, res) => {
      let urlPath = req.url.split('?')[0]; // Remove query params

      // Security: prevent directory traversal
      if (urlPath.includes('..')) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      // Default to index.html for root
      if (urlPath === '/') urlPath = '/index.html';

      // SPA routing: if no file extension and not /api, serve index.html
      const filePath = path.join(staticDir, urlPath);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        // Try with .html extension (Next.js static export uses clean URLs)
        const htmlPath = filePath + '.html';
        if (fs.existsSync(htmlPath)) {
          serveFile(htmlPath, res, MIME_TYPES);
          return;
        }
        // Try index.html for SPA routing
        const indexPath = path.join(staticDir, 'index.html');
        if (fs.existsSync(indexPath)) {
          serveFile(indexPath, res, MIME_TYPES);
          return;
        }
        // 404
        const notFoundPath = path.join(staticDir, '404.html');
        if (fs.existsSync(notFoundPath)) {
          res.writeHead(404);
          serveFile(notFoundPath, res, MIME_TYPES);
        } else {
          res.writeHead(404);
          res.end('Not Found');
        }
        return;
      }

      // If it's a directory, try index.html inside
      if (fs.statSync(filePath).isDirectory()) {
        const indexPath = path.join(filePath, 'index.html');
        if (fs.existsSync(indexPath)) {
          serveFile(indexPath, res, MIME_TYPES);
          return;
        }
      }

      serveFile(filePath, res, MIME_TYPES);
    });

    function serveFile(filePath, res, mimeTypes) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';

      try {
        const data = fs.readFileSync(filePath);
        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': 'no-cache',
        });
        res.end(data);
      } catch (err) {
        res.writeHead(500);
        res.end('Internal Server Error');
      }
    }

    staticServer.listen(PORT, '127.0.0.1', () => {
      console.log('[Electron] Static server running on http://127.0.0.1:' + PORT);
      resolve();
    });

    staticServer.on('error', (err) => {
      console.error('[Electron] Static server error:', err);
      reject(err);
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'ЭпизоМонитор — Карта эпизоотических угроз',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
    backgroundColor: '#0f172a',
  });

  // Custom menu
  const menuTemplate = [
    {
      label: 'Файл',
      submenu: [
        { label: 'Обновить', accelerator: 'CmdOrCtrl+R', click: () => mainWindow.reload() },
        { type: 'separator' },
        { label: 'Выход', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() },
      ],
    },
    {
      label: 'Вид',
      submenu: [
        { label: 'Увеличить', accelerator: 'CmdOrCtrl+Plus', click: () => mainWindow.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() + 0.5) },
        { label: 'Уменьшить', accelerator: 'CmdOrCtrl+-', click: () => mainWindow.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() - 0.5) },
        { label: 'Сбросить масштаб', accelerator: 'CmdOrCtrl+0', click: () => mainWindow.webContents.setZoomLevel(0) },
        { type: 'separator' },
        { label: 'Полный экран', accelerator: 'F11', click: () => mainWindow.setFullScreen(!mainWindow.isFullScreen()) },
        { type: 'separator' },
        { label: 'Инструменты разработчика', accelerator: 'F12', click: () => mainWindow.webContents.toggleDevTools() },
      ],
    },
    {
      label: 'Справка',
      submenu: [
        { label: 'О программе', click: () => {
          dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'О программе ЭпизоМонитор',
            message: 'ЭпизоМонитор v0.2.0',
            detail: 'Интерактивная карта эпизоотических угроз\nдля ветеринарной службы.\n\nЮжный федеральный округ (ЮФО)\nСеверо-Кавказский федеральный округ (СКФО)\n+ 7 приграничных регионов ЦФО/ПФО\n\nИсточники: ФСВПС, ВНИИЗЖ, ВОЗЖ/WOAH',
          });
        }},
        { type: 'separator' },
        { label: 'ФСВПС — fsvps.gov.ru', click: () => shell.openExternal('https://fsvps.gov.ru') },
        { label: 'ВОЗЖ — woah.org', click: () => shell.openExternal('https://www.woah.org') },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  // Open external links in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Show window when content is loaded
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Load the app from our static server
  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
}

app.whenReady().then(async () => {
  try {
    await startStaticServer();
    createWindow();
  } catch (err) {
    console.error('[Electron] Startup error:', err);
    // Show error window
    createWindow();
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
      <html><body style="background:#0f172a;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
        <div style="text-align:center;">
          <h1 style="color:#dc2626;">Ошибка запуска</h1>
          <p>Не удалось запустить сервер приложения.</p>
          <p style="color:#94a3b8;font-size:12px;">Попробуйте перезапустить программу.</p>
        </div>
      </body></html>
    `)}`);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (staticServer) {
    console.log('[Electron] Stopping static server...');
    staticServer.close();
    staticServer = null;
  }
});
