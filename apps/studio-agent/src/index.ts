import express from 'express';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import cors from 'cors';
import { getDatabase } from './database/db';
import { FolderWatcher } from './watcher/folderWatcher';
import { SyncClient } from './sync/syncClient';
import { TunnelManager } from './tunnel/tunnelManager';

// Capturing console logs for the live GUI dashboard terminal view
const logBuffer: string[] = [];
const captureLog = (type: 'LOG' | 'ERROR', ...args: any[]) => {
  const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
  const time = new Date().toLocaleTimeString();
  logBuffer.push(`[${time}] [${type}] ${msg}`);
  if (logBuffer.length > 150) {
    logBuffer.shift();
  }
};
const originalLog = console.log;
const originalError = console.error;
console.log = (...args) => {
  captureLog('LOG', ...args);
  originalLog(...args);
};
console.error = (...args) => {
  captureLog('ERROR', ...args);
  originalError(...args);
};

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / (3600*24));
  const h = Math.floor(seconds % (3600*24) / 3600);
  const m = Math.floor(seconds % 3600 / 60);
  const s = Math.floor(seconds % 60);
  
  const dDisplay = d > 0 ? d + "d " : "";
  const hDisplay = h > 0 ? h + "h " : "";
  const mDisplay = m > 0 ? m + "m " : "";
  const sDisplay = s > 0 ? s + "s" : s + "s";
  return dDisplay + hDisplay + mDisplay + sDisplay;
}

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.AGENT_PORT || 8080;

const dashboardHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PhotoSelect Agent Dashboard</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #09090b;
      --card-bg: rgba(18, 18, 22, 0.7);
      --border: rgba(255, 255, 255, 0.08);
      --indigo: #6366f1;
      --emerald: #10b981;
      --zinc-400: #a1a1aa;
      --zinc-550: #6a6a75;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Outfit', sans-serif;
      background-color: var(--bg);
      color: #f4f4f5;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
    }
    header {
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 50;
      background: rgba(9, 9, 11, 0.7);
    }
    .header-logo {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-weight: 700;
      font-size: 1.25rem;
      color: #fff;
    }
    .status-badge {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
      font-weight: 600;
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.15);
      color: var(--emerald);
      padding: 0.35rem 0.85rem;
      border-radius: 9999px;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      background: var(--emerald);
      border-radius: 50%;
      box-shadow: 0 0 10px var(--emerald);
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { opacity: 0.4; }
      50% { opacity: 1; }
      100% { opacity: 0.4; }
    }
    .container {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      gap: 1.5rem;
      padding: 2rem;
      max-width: 1400px;
      width: 100%;
      margin: 0 auto;
      flex: 1;
    }
    .card {
      background: var(--card-bg);
      backdrop-filter: blur(16px);
      border: 1px solid var(--border);
      border-radius: 1rem;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      box-shadow: 0 4px 30px rgba(0, 0, 0, 0.4);
    }
    .col-3 { grid-column: span 3; }
    .col-6 { grid-column: span 6; }
    .col-12 { grid-column: span 12; }
    @media (max-width: 1024px) {
      .col-3 { grid-column: span 6; }
    }
    @media (max-width: 768px) {
      .col-3, .col-6, .col-12 { grid-column: span 12; }
    }
    h2 {
      font-size: 1.1rem;
      font-weight: 600;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.5rem;
    }
    .stat-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .stat-val {
      font-size: 1.75rem;
      font-weight: 700;
      color: #fff;
    }
    .stat-label {
      font-size: 0.875rem;
      color: var(--zinc-400);
    }
    .console-panel {
      font-family: 'Courier New', Courier, monospace;
      background: #050507;
      border: 1px solid var(--border);
      border-radius: 0.75rem;
      padding: 1rem;
      height: 350px;
      overflow-y: auto;
      white-space: pre-wrap;
      font-size: 0.8125rem;
      color: #38bdf8;
      box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.8);
    }
    .table-container {
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.875rem;
    }
    th {
      padding: 0.75rem;
      border-bottom: 1px solid var(--border);
      color: var(--zinc-550);
      font-weight: 600;
    }
    td {
      padding: 0.75rem;
      border-bottom: 1px solid rgba(255,255,255,0.03);
      color: var(--zinc-200);
    }
    .tunnel-url {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border);
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      font-family: monospace;
      font-size: 0.875rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      word-break: break-all;
    }
    .btn {
      background: var(--indigo);
      border: none;
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.8125rem;
      transition: background 0.2s, transform 0.1s;
    }
    .btn:hover { background: #4f46e5; }
    .btn:active { transform: scale(0.98); }
    .dashboard-footer {
      text-align: center;
      padding: 1.5rem;
      color: var(--zinc-550);
      font-size: 0.75rem;
      border-top: 1px solid var(--border);
    }
  </style>
</head>
<body>
  <header>
    <div class="header-logo">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
      <span>PhotoSelect Engine Panel</span>
    </div>
    <div class="status-badge">
      <div class="status-dot"></div>
      <span id="engine-status">ONLINE</span>
    </div>
  </header>

  <div class="container">
    <div class="card col-3">
      <h2>📁 Active Folders</h2>
      <div class="stat-row">
        <div class="stat-val" id="folders-count">0</div>
        <div class="stat-label">Watched</div>
      </div>
    </div>
    <div class="card col-3">
      <h2>✅ Synced Photos</h2>
      <div class="stat-row">
        <div class="stat-val" id="synced-count" style="color: var(--emerald);">0</div>
        <div class="stat-label">To Cloud</div>
      </div>
    </div>
    <div class="card col-3">
      <h2>⏳ Pending Sync</h2>
      <div class="stat-row">
        <div class="stat-val" id="pending-count" style="color: #f59e0b;">0</div>
        <div class="stat-label">Queued</div>
      </div>
    </div>
    <div class="card col-3">
      <h2>⚙️ System Info</h2>
      <div class="stat-row">
        <div>
          <div style="font-size: 1rem; font-weight: 600;" id="sys-uptime">0s</div>
          <div class="stat-label" id="sys-mem">Memory: --</div>
        </div>
      </div>
    </div>

    <div class="card col-12">
      <h2>🔗 Cloud Link Relay Tunnel</h2>
      <div class="tunnel-url">
        <span id="tunnel-url">Initializing secure link...</span>
        <button class="btn" onclick="copyTunnel()">Copy URL</button>
      </div>
    </div>

    <div class="card col-6">
      <h2>📂 Watched Folder Connections</h2>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Host Path</th>
              <th>Mapped Album ID</th>
            </tr>
          </thead>
          <tbody id="folders-table">
            <tr>
              <td colspan="2" style="text-align: center; color: var(--zinc-550);">No active watched folders yet.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="card col-6">
      <h2>🖥️ Live Sync Engine Output</h2>
      <div class="console-panel" id="console-logs">System startup logged. Waiting for sync activity...</div>
    </div>
  </div>

  <footer class="dashboard-footer">
    PhotoSelect Local Agent Engine • Active on Port 8082
  </footer>

  <script>
    async function copyTunnel() {
      const el = document.getElementById('tunnel-url');
      if (el && el.innerText.startsWith('http')) {
        await navigator.clipboard.writeText(el.innerText);
        alert('Tunnel URL copied to clipboard!');
      }
    }

    async function updateDashboard() {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        if (data.success) {
          document.getElementById('engine-status').innerText = 'ONLINE';
          document.getElementById('folders-count').innerText = data.folders.length;
          document.getElementById('synced-count').innerText = data.stats.SYNCED || 0;
          document.getElementById('pending-count').innerText = data.stats.PENDING || 0;
          document.getElementById('sys-uptime').innerText = data.system.uptime;
          document.getElementById('sys-mem').innerText = 'Memory: ' + data.system.memory;
          document.getElementById('tunnel-url').innerText = data.tunnelUrl;

          const tbody = document.getElementById('folders-table');
          if (data.folders.length > 0) {
            tbody.innerHTML = data.folders.map(f => {
              const displayPath = f.path.replace('/usr/src/app/watched_photos/', '📂 /');
              return '<tr><td>' + displayPath + '</td><td><span style="font-family: monospace; font-size: 0.8rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 0.15rem 0.4rem; border-radius: 0.25rem;">' + f.album_id + '</span></td></tr>';
            }).join('');
          } else {
            tbody.innerHTML = '<tr><td colspan="2" style="text-align: center; color: var(--zinc-550);">No active watched folders yet.</td></tr>';
          }
        }
      } catch (err) {
        document.getElementById('engine-status').innerText = 'OFFLINE';
      }

      try {
        const res = await fetch('/api/logs');
        const data = await res.json();
        if (data.success && data.logs.length > 0) {
          const logBox = document.getElementById('console-logs');
          const isAtBottom = logBox.scrollHeight - logBox.clientHeight <= logBox.scrollTop + 20;
          logBox.innerText = data.logs.join('\\n');
          if (isAtBottom) {
            logBox.scrollTop = logBox.scrollHeight;
          }
        }
      } catch (err) {}
    }

    updateDashboard();
    setInterval(updateDashboard, 1500);
  </script>
</body>
</html>
`;

app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(dashboardHtml);
});

app.get('/api/status', async (req, res) => {
  try {
    const db = await getDatabase();
    const folders = await db.all('SELECT * FROM watched_folders');
    const imagesCount = await db.all(`
      SELECT sync_status, COUNT(*) as count 
      FROM local_images 
      GROUP BY sync_status
    `);
    
    const stats: Record<string, number> = { PENDING: 0, SYNCED: 0, ORPHANED: 0 };
    imagesCount.forEach(row => {
      stats[row.sync_status] = row.count;
    });

    const tunnelUrl = TunnelManager.getInstance().getTunnelUrl();

    // System metrics
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();

    res.status(200).json({
      success: true,
      status: 'online',
      tunnelUrl: tunnelUrl || 'Initializing secure tunnel relay...',
      folders,
      stats,
      system: {
        uptime: formatUptime(uptime),
        memory: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/logs', (req, res) => {
  res.status(200).json({ success: true, logs: logBuffer });
});

// HTTP Range & Chunk Image Streamer
app.get('/stream/:imageId', async (req, res, next) => {
  try {
    const { imageId } = req.params;
    const { size } = req.query;
    const db = await getDatabase();
    
    // Locate image cached details
    const image = await db.get('SELECT * FROM local_images WHERE id = ?', [imageId]);
    
    if (!image) {
      res.status(404).send('Image resource not found');
      return;
    }

    let filePath = image.watermark_preview_path;
    if (size === 'thumbnail' && image.thumbnail_path) {
      filePath = image.thumbnail_path;
    } else if (size === 'preview' && image.preview_path) {
      filePath = image.preview_path;
    }

    if (!filePath || !fs.existsSync(filePath)) {
      res.status(404).send('Physical image asset missing');
      return;
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    // Set appropriate image response headers
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache

    if (range) {
      // Parse Range Header: e.g. "bytes=32768-"
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        res.status(416).send('Requested range not satisfiable');
        return;
      }

      const chunksize = (end - start) + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });
      
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
      });
      
      fileStream.pipe(res);
    } else {
      // Stream whole file
      res.writeHead(200, {
        'Content-Length': fileSize,
      });
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    next(err);
  }
});

// Stream image by albumId and filename (highly resilient fallback to prevent ID mismatches)
app.get('/stream/file/:albumId/:filename', async (req, res, next) => {
  try {
    const { albumId, filename } = req.params;
    const { size } = req.query;
    const db = await getDatabase();
    
    // Locate image using albumId and filename
    const image = await db.get(
      'SELECT * FROM local_images WHERE album_id = ? AND filename = ?',
      [albumId, filename]
    );
    
    if (!image) {
      res.status(404).send('Image resource not found');
      return;
    }

    let filePath = image.watermark_preview_path;
    if (size === 'thumbnail' && image.thumbnail_path) {
      filePath = image.thumbnail_path;
    } else if (size === 'preview' && image.preview_path) {
      filePath = image.preview_path;
    }

    if (!filePath || !fs.existsSync(filePath)) {
      res.status(404).send('Physical image asset missing');
      return;
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=31536000');

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        res.status(416).send('Requested range not satisfiable');
        return;
      }

      const chunksize = (end - start) + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });
      
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
      });
      
      fileStream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
      });
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    next(err);
  }
});

// Admin helper endpoint to add watch folders dynamically
app.post('/watch-folder', async (req, res) => {
  const { path: folderPath, albumId } = req.body;
  if (!folderPath || !albumId) {
    res.status(400).json({ error: 'path and albumId parameters are required' });
    return;
  }

  try {
    // Automatically create directory if it doesn't exist
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const db = await getDatabase();
    const id = Math.random().toString(36).substring(2, 9);
    
    await db.run(
      'INSERT OR REPLACE INTO watched_folders (id, path, album_id) VALUES (?, ?, ?)',
      [id, folderPath, albumId]
    );

    // Watch folder immediately
    watcher.watch(folderPath, albumId);

    res.status(200).json({ success: true, message: `Watching path: ${folderPath}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Export selected files to a physical subfolder
app.post('/export-selected', async (req, res) => {
  const { albumId, filenames } = req.body;
  if (!albumId || !Array.isArray(filenames)) {
    res.status(400).json({ error: 'albumId and filenames array are required' });
    return;
  }

  try {
    const db = await getDatabase();
    const folder = await db.get('SELECT * FROM watched_folders WHERE album_id = ?', [albumId]);
    
    if (!folder) {
      res.status(404).json({ error: 'No watched folder found for this album' });
      return;
    }

    const exportPath = path.join(folder.path, 'Selected_Photos');
    if (!fs.existsSync(exportPath)) {
      fs.mkdirSync(exportPath, { recursive: true });
    }

    let copiedCount = 0;
    for (const filename of filenames) {
      const record = await db.get(
        'SELECT local_path FROM local_images WHERE album_id = ? AND filename = ?',
        [albumId, filename]
      );
      
      if (record && record.local_path && fs.existsSync(record.local_path)) {
        const dest = path.join(exportPath, filename);
        fs.copyFileSync(record.local_path, dest);
        copiedCount++;
      }
    }

    res.status(200).json({ 
      success: true, 
      message: `Successfully copied ${copiedCount} files to Selected_Photos folder`,
      exportPath: exportPath
    });
  } catch (error: any) {
    console.error('Failed to export files', error);
    res.status(500).json({ error: error.message });
  }
});

// Manual Scan and Upload Trigger Endpoint (interactive Scanning -> Processing -> Syncing -> Completed workflow)
app.post('/albums/:albumId/scan', async (req, res) => {
  const { albumId } = req.params;
  try {
    const db = await getDatabase();
    const folder = await db.get('SELECT * FROM watched_folders WHERE album_id = ?', [albumId]);
    if (!folder) {
      res.status(404).json({ error: 'No watched folder configuration found for this album.' });
      return;
    }

    res.status(200).json({ success: true, message: 'Scanning sequence started' });

    // Run the scan asynchronously in the background so the HTTP response is sent immediately
    (async () => {
      try {
        console.log(`🔍 Manual scan requested for album: ${albumId} in ${folder.path}`);
        
        // Fetch current album status to preserve it (unlocked/locked state)
        const albumDetails = await syncClient.getAlbum(albumId);
        let originalStatus = albumDetails?.status || 'PENDING';
        if (['SCANNING', 'PROCESSING', 'SYNCING'].includes(originalStatus)) {
          originalStatus = 'PENDING';
        }

        await syncClient.updateAlbumStatus(albumId, 'SCANNING');

        const watermarkConfig = await db.get('SELECT value FROM local_config WHERE key = ?', ['watermark_text']);
        const watermarkText = watermarkConfig?.value || 'PhotoSelect';

        if (fs.existsSync(folder.path)) {
          // Recursive helper to get all photos inside folder (supporting subfolders)
          const getFiles = (dir: string): string[] => {
            let results: string[] = [];
            const list = fs.readdirSync(dir);
            list.forEach((file) => {
              const fullPath = path.join(dir, file);
              const stat = fs.statSync(fullPath);
              if (stat && stat.isDirectory()) {
                results = results.concat(getFiles(fullPath));
              } else {
                const ext = path.extname(file).toLowerCase();
                if (['.jpg', '.jpeg', '.png', '.webp', '.tiff'].includes(ext)) {
                  results.push(fullPath);
                }
              }
            });
            return results;
          };

          const files = getFiles(folder.path);
          console.log(`📂 Manual Scan: Detected ${files.length} photos in watched directory.`);

          let hasNewFiles = false;

          for (const filePath of files) {
            // Check if file already exists in local SQLite
            const existing = await db.get('SELECT id FROM local_images WHERE local_path = ?', [filePath]);
            if (!existing) {
              if (!hasNewFiles) {
                hasNewFiles = true;
                // Switch to PROCESSING status on cloud as soon as we start resizing/processing
                await syncClient.updateAlbumStatus(albumId, 'PROCESSING');
              }
              
              console.log(`📸 Manual Scan: Processing new photo: ${filePath}`);
              try {
                const result = await watcher.imageProcessor.processImage(filePath, watermarkText);
                await db.run(
                  `INSERT OR REPLACE INTO local_images 
                   (id, album_id, filename, local_path, hash, sync_status, width, height, file_size, thumbnail_path, preview_path, watermark_preview_path, exif_data)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    result.id,
                    albumId,
                    path.basename(filePath),
                    filePath,
                    result.hash,
                    'PENDING',
                    result.width,
                    result.height,
                    result.fileSize,
                    result.thumbnailPath,
                    result.previewPath,
                    result.watermarkPreviewPath,
                    JSON.stringify(result.exifData),
                  ]
                );
              } catch (procErr) {
                console.error(`❌ Failed to process manual scan file: ${filePath}`, procErr);
              }
            }
          }
        }

        // Set status to SYNCING and push metadata to cloud
        await syncClient.updateAlbumStatus(albumId, 'SYNCING');
        await syncClient.syncPendingMetadata();

        // Finally restore the original status (e.g. PENDING or COMPLETED)
        await syncClient.updateAlbumStatus(albumId, originalStatus);
        console.log(`✅ Manual scan completed successfully for album: ${albumId}. Restored status to: ${originalStatus}`);
      } catch (scanErr: any) {
        console.error('❌ Manual scan execution failed:', scanErr.message);
      }
    })();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Boot dependencies
let watcher: FolderWatcher;
let syncClient: SyncClient;

async function bootstrap() {
  // Ensure SQLite migrations run
  await getDatabase();

  // Start Cloudflare Tunnel
  TunnelManager.getInstance().start();

  // Start folder watcher
  watcher = new FolderWatcher();
  await watcher.initialize();
  watcher.onLocalChange(() => {
    console.log('🔄 Local changes detected (add/remove). Triggering immediate heartbeat sync...');
    syncClient?.sendHeartbeat();
  });

  // Start cloud synchronization agent client
  syncClient = new SyncClient();
  await syncClient.start();

  app.listen(PORT, () => {
    console.log(`🔌 Local Studio Agent Express server running on port ${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start local studio agent:', err);
});
