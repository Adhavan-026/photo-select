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
