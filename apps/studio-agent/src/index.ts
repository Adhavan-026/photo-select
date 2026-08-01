import express from 'express';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import cors from 'cors';
import { getDatabase } from './database/db';
import { FolderWatcher } from './watcher/folderWatcher';
import { SyncClient } from './sync/syncClient';
import { TunnelManager } from './tunnel/tunnelManager';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.AGENT_PORT || 8080;

app.get('/', (req, res) => {
  res.status(200).json({ status: 'online', message: 'Local Studio Agent is actively running over secure Cloudflare tunnel!' });
});

// HTTP Range & Chunk Image Streamer
app.get('/stream/:imageId', async (req, res, next) => {
  try {
    const { imageId } = req.params;
    const db = await getDatabase();
    
    // Locate image cached details
    const image = await db.get('SELECT * FROM local_images WHERE id = ?', [imageId]);
    
    if (!image || !image.watermark_preview_path) {
      res.status(404).send('Image resource not found');
      return;
    }

    const filePath = image.watermark_preview_path;
    if (!fs.existsSync(filePath)) {
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
    const db = await getDatabase();
    
    // Locate image using albumId and filename
    const image = await db.get(
      'SELECT * FROM local_images WHERE album_id = ? AND filename = ?',
      [albumId, filename]
    );
    
    if (!image || !image.watermark_preview_path) {
      res.status(404).send('Image resource not found');
      return;
    }

    const filePath = image.watermark_preview_path;
    if (!fs.existsSync(filePath)) {
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
