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

const dashboardHtml = \`
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Studioz Engine Panel</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: { 
            sans: ['Inter', 'sans-serif'],
            serif: ['Playfair Display', 'serif']
          },
          colors: {
            onyx: {
              900: '#0a0a0a',
              800: '#15151a',
              700: '#1a1a24'
            },
            gold: {
              400: '#fbbf24',
              500: '#f59e0b',
              600: '#d97706'
            }
          }
        }
      }
    }
  </script>
</head>
<body class="bg-onyx-900 text-slate-200 font-sans min-h-screen flex flex-col relative overflow-x-hidden">
  <div class="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gold-500/5 blur-[150px] pointer-events-none"></div>
  <header class="sticky top-0 z-50 bg-onyx-900/80 backdrop-blur-md border-b border-white/5 px-6 py-4 flex justify-between items-center shadow-lg">
    <div class="flex items-center gap-3">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-gold-500"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
      <span class="text-xl font-serif text-white tracking-wide">Studioz <span class="text-slate-500 font-sans text-sm font-normal uppercase tracking-widest ml-1">Engine</span></span>
    </div>
    <div class="flex items-center gap-4">
      <div id="status-badge" class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold transition-colors">
        <span class="relative flex h-2 w-2">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span>RUNNING</span>
      </div>
    </div>
  </header>

  <main class="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6 relative z-10">
    
    <!-- Control Panel -->
    <div class="md:col-span-12 bg-onyx-800/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
      <div>
        <h2 class="text-lg font-semibold text-white mb-1">Engine Controls</h2>
        <p class="text-sm text-slate-400">Manage the local background synchronization engine.</p>
      </div>
      <div class="flex items-center gap-3">
        <button id="btn-start" onclick="startEngine()" class="px-6 py-2.5 bg-gold-500 hover:bg-gold-400 text-black font-semibold rounded-lg shadow-lg shadow-gold-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          Start Engine
        </button>
        <button id="btn-stop" onclick="stopEngine()" class="px-6 py-2.5 bg-onyx-700 hover:bg-rose-500/20 hover:text-rose-400 border border-white/5 hover:border-rose-500/50 text-slate-300 font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h12v12H6z"/></svg>
          Stop Engine
        </button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="md:col-span-3 bg-onyx-800/60 backdrop-blur-lg border border-white/5 rounded-xl p-5 shadow-lg">
      <h3 class="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2"><span class="text-gold-400">📁</span> Watched Folders</h3>
      <div class="text-3xl font-bold text-white" id="folders-count">0</div>
    </div>
    <div class="md:col-span-3 bg-onyx-800/60 backdrop-blur-lg border border-white/5 rounded-xl p-5 shadow-lg">
      <h3 class="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2"><span class="text-emerald-400">✅</span> Synced Photos</h3>
      <div class="text-3xl font-bold text-emerald-400" id="synced-count">0</div>
    </div>
    <div class="md:col-span-3 bg-onyx-800/60 backdrop-blur-lg border border-white/5 rounded-xl p-5 shadow-lg">
      <h3 class="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2"><span class="text-rose-400">⏳</span> Pending Sync</h3>
      <div class="text-3xl font-bold text-rose-400" id="pending-count">0</div>
    </div>
    <div class="md:col-span-3 bg-onyx-800/60 backdrop-blur-lg border border-white/5 rounded-xl p-5 shadow-lg">
      <h3 class="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2"><span class="text-purple-400">⚙️</span> System</h3>
      <div class="text-xl font-bold text-white mb-1" id="sys-uptime">0s</div>
      <div class="text-xs text-slate-500" id="sys-mem">Memory: --</div>
    </div>

    <!-- Cloud Link -->
    <div class="md:col-span-12 bg-onyx-800/60 backdrop-blur-lg border border-white/5 rounded-xl p-5 shadow-lg flex items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <span class="text-lg">🔗</span>
        <div>
          <div class="text-sm font-medium text-slate-300">Secure Cloud Tunnel</div>
          <div class="font-mono text-xs text-gold-400 break-all" id="tunnel-url">Initializing...</div>
        </div>
      </div>
      <button onclick="copyTunnel()" class="shrink-0 px-4 py-2 bg-onyx-700 hover:bg-onyx-900 text-slate-300 text-sm font-medium rounded-lg transition-colors border border-white/5">Copy URL</button>
    </div>

    <!-- Live Feed -->
    <div class="md:col-span-12 bg-onyx-800/60 backdrop-blur-lg border border-white/5 rounded-xl overflow-hidden shadow-lg flex flex-col h-[400px]">
      <div class="px-5 py-3 border-b border-white/5 bg-onyx-700/50 flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full bg-slate-600"></span>
        <span class="w-2.5 h-2.5 rounded-full bg-slate-600"></span>
        <span class="w-2.5 h-2.5 rounded-full bg-slate-600"></span>
        <span class="ml-2 text-xs font-medium text-slate-500 uppercase tracking-wider">Live Engine Console</span>
      </div>
      <div class="flex-1 p-5 overflow-y-auto font-mono text-xs text-slate-400 leading-relaxed bg-onyx-900/50" id="console-logs">
        System startup logged. Waiting for sync activity...
      </div>
    </div>
  </main>

  <footer class="py-6 text-center text-xs text-slate-600 border-t border-white/5 mt-auto relative z-10">
    Studioz Local Agent Engine &copy; 2026 &bull; Active on Port 8082
  </footer>

  <script>
    let isRunning = true;

    async function copyTunnel() {
      const el = document.getElementById('tunnel-url');
      if (el && el.innerText.startsWith('http')) {
        await navigator.clipboard.writeText(el.innerText);
      }
    }

    async function startEngine() {
      document.getElementById('btn-start').disabled = true;
      try {
        const res = await fetch('/api/engine/start', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          isRunning = true;
          updateUIState();
        }
      } catch (e) {
        console.error(e);
      }
      document.getElementById('btn-start').disabled = false;
    }

    async function stopEngine() {
      document.getElementById('btn-stop').disabled = true;
      try {
        const res = await fetch('/api/engine/stop', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          isRunning = false;
          updateUIState();
        }
      } catch (e) {
        console.error(e);
      }
      document.getElementById('btn-stop').disabled = false;
    }

    function updateUIState() {
      const badge = document.getElementById('status-badge');
      const btnStart = document.getElementById('btn-start');
      const btnStop = document.getElementById('btn-stop');

      if (isRunning) {
        badge.className = "flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold transition-colors";
        badge.innerHTML = \`<span class="relative flex h-2 w-2"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span> <span>RUNNING</span>\`;
        btnStart.disabled = true;
        btnStart.classList.add('opacity-50', 'cursor-not-allowed');
        btnStop.disabled = false;
        btnStop.classList.remove('opacity-50', 'cursor-not-allowed');
      } else {
        badge.className = "flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-semibold transition-colors";
        badge.innerHTML = \`<span class="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span> <span>STOPPED</span>\`;
        btnStart.disabled = false;
        btnStart.classList.remove('opacity-50', 'cursor-not-allowed');
        btnStop.disabled = true;
        btnStop.classList.add('opacity-50', 'cursor-not-allowed');
      }
    }

    async function updateDashboard() {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        if (data.success) {
          if (isRunning !== (data.engineState === 'RUNNING')) {
            isRunning = (data.engineState === 'RUNNING');
            updateUIState();
          }

          document.getElementById('folders-count').innerText = data.folders.length;
          document.getElementById('synced-count').innerText = data.stats.SYNCED || 0;
          document.getElementById('pending-count').innerText = data.stats.PENDING || 0;
          document.getElementById('sys-uptime').innerText = data.system.uptime;
          document.getElementById('sys-mem').innerText = data.system.memory;
          document.getElementById('tunnel-url').innerText = data.tunnelUrl;
        }
      } catch (e) {
        document.getElementById('status-badge').className = "flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-500/10 border border-slate-500/20 text-slate-400 text-sm font-semibold transition-colors";
        document.getElementById('status-badge').innerHTML = \`<span>OFFLINE</span>\`;
      }

      try {
        const logsRes = await fetch('/api/logs');
        const logsData = await logsRes.json();
        if (logsData.success) {
          const consoleEl = document.getElementById('console-logs');
          // Only auto-scroll if we're near the bottom
          const isScrolledToBottom = consoleEl.scrollHeight - consoleEl.clientHeight <= consoleEl.scrollTop + 50;
          
          consoleEl.innerHTML = logsData.logs.join('\\n');
          
          if (isScrolledToBottom) {
            consoleEl.scrollTop = consoleEl.scrollHeight;
          }
        }
      } catch (e) {}
    }

    setInterval(updateDashboard, 2000);
    updateDashboard();
  </script>
</body>
</html>
\`;

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
      engineState: engineState,
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
        const watermarkText = watermarkConfig?.value || 'Studioz';

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

          const filesToProcess: string[] = [];
          for (const filePath of files) {
            const existing = await db.get('SELECT id FROM local_images WHERE local_path = ?', [filePath]);
            if (!existing) {
              filesToProcess.push(filePath);
            }
          }

          if (filesToProcess.length > 0) {
            console.log(`📸 Manual Scan: Processing ${filesToProcess.length} new photos concurrently...`);
            await syncClient.updateAlbumStatus(albumId, 'PROCESSING');

            // Process concurrently in chunks of 5 to maximize CPU core utilization
            const concurrency = 5;
            for (let i = 0; i < filesToProcess.length; i += concurrency) {
              const chunk = filesToProcess.slice(i, i + concurrency);
              await Promise.all(chunk.map(async (filePath) => {
                try {
                  console.log(`📸 Manual Scan: Processing: ${path.basename(filePath)}`);
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
              }));
              console.log(`📸 Processed batch ${Math.min(i + concurrency, filesToProcess.length)}/${filesToProcess.length} photos`);
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
let engineState: 'RUNNING' | 'STOPPED' = 'RUNNING';

app.post('/api/engine/start', async (req, res) => {
  if (engineState === 'RUNNING') {
    return res.json({ success: true, state: engineState, message: 'Already running' });
  }
  try {
    console.log('▶️ START COMMAND RECEIVED: Booting up local engine...');
    await watcher.initialize();
    await syncClient.start();
    engineState = 'RUNNING';
    res.json({ success: true, state: engineState });
  } catch (err: any) {
    console.error('Failed to start engine', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/engine/stop', async (req, res) => {
  if (engineState === 'STOPPED') {
    return res.json({ success: true, state: engineState, message: 'Already stopped' });
  }
  try {
    console.log('⏹️ STOP COMMAND RECEIVED: Halting local engine processes...');
    await watcher.stopAll();
    syncClient.stop();
    engineState = 'STOPPED';
    res.json({ success: true, state: engineState });
  } catch (err: any) {
    console.error('Failed to stop engine', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

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
