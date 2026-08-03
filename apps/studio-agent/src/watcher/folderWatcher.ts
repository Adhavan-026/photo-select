import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs';
import { getDatabase } from '../database/db';
import { ImageProcessor } from '../processor/imageProcessor';

export class FolderWatcher {
  private watchers: Map<string, chokidar.FSWatcher> = new Map();
  public imageProcessor: ImageProcessor;
  private onChangeCallback: (() => void) | null = null;
  private changeTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.imageProcessor = new ImageProcessor();
  }

  onLocalChange(callback: () => void) {
    this.onChangeCallback = callback;
  }

  private triggerChange() {
    if (this.changeTimeout) clearTimeout(this.changeTimeout);
    this.changeTimeout = setTimeout(() => {
      if (this.onChangeCallback) {
        this.onChangeCallback();
      }
    }, 2000); // 2 seconds debounce
  }

  async initialize() {
    const db = await getDatabase();
    const folders = await db.all('SELECT * FROM watched_folders');

    for (const folder of folders) {
      this.watch(folder.path, folder.album_id);
    }
  }

  watch(folderPath: string, albumId: string) {
    if (this.watchers.has(folderPath)) return;

    console.log(`👁️ Watching folder: ${folderPath} for album: ${albumId}`);

    const watcher = chokidar.watch(folderPath, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: false,
      usePolling: true,
      interval: 1000, // check for changes every second (essential for Docker-on-Windows volume mounts)
    });

    watcher.on('add', async (filePath) => {
      const ext = path.extname(filePath).toLowerCase();
      if (!['.jpg', '.jpeg', '.png', '.webp', '.tiff'].includes(ext)) return;

      try {
        console.log(`📸 New photo detected: ${filePath}`);
        
        const db = await getDatabase();
        const watermarkConfig = await db.get('SELECT value FROM local_config WHERE key = ?', ['watermark_text']);
        const watermarkText = watermarkConfig?.value || 'Studioz';

        // 1. Process image
        const result = await this.imageProcessor.processImage(filePath, watermarkText);

        // 2. Save metadata in local database
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

        console.log(`✅ Processed and cached locally: ${path.basename(filePath)}`);
        this.triggerChange();
      } catch (err) {
        console.error(`❌ Failed to process detected photo: ${filePath}`, err);
      }
    });

    watcher.on('unlink', async (filePath) => {
      console.log(`🗑️ Photo deleted locally: ${filePath}`);
      const db = await getDatabase();
      
      // Delete metadata and preview assets
      const record = await db.get('SELECT * FROM local_images WHERE local_path = ?', [filePath]);
      if (record) {
        // Remove processed caches
        [record.thumbnail_path, record.preview_path, record.watermark_preview_path].forEach((p) => {
          if (p && fs.existsSync(p)) {
            fs.unlinkSync(p);
          }
        });

        await db.run('DELETE FROM local_images WHERE local_path = ?', [filePath]);
        this.triggerChange();
      }
    });

    this.watchers.set(folderPath, watcher);
  }

  unwatch(folderPath: string) {
    const watcher = this.watchers.get(folderPath);
    if (watcher) {
      watcher.close();
      this.watchers.delete(folderPath);
      console.log(`🚫 Unwatched folder: ${folderPath}`);
    }
  }

  async stopAll() {
    console.log('🛑 Halting all local folder watchers...');
    for (const [folderPath, watcher] of this.watchers.entries()) {
      await watcher.close();
      console.log(`🚫 Unwatched folder: ${folderPath}`);
    }
    this.watchers.clear();
    if (this.changeTimeout) {
      clearTimeout(this.changeTimeout);
      this.changeTimeout = null;
    }
  }
}
export default FolderWatcher;
