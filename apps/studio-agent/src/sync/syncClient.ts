import axios from 'axios';
import { getDatabase } from '../database/db';
import { TunnelManager } from '../tunnel/tunnelManager';

export class SyncClient {
  private apiUrl: string;
  private email: string;
  private passwordPlain: string;
  private tunnelUrl: string;
  private token: string | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.apiUrl = process.env.CLOUD_API_URL || 'http://localhost:5000/api/v1';
    this.email = process.env.STUDIO_OWNER_EMAIL || '';
    this.passwordPlain = process.env.STUDIO_OWNER_PASSWORD || '';
    this.tunnelUrl = process.env.TUNNEL_URL || 'https://studio-relay.trycloudflare.com';
  }

  async start() {
    console.log('🔄 Starting local agent Sync client...');
    
    // Initial login attempt
    await this.authenticate();

    // Start timers (1 minute check intervals)
    this.heartbeatInterval = setInterval(() => this.sendHeartbeat(), 60 * 1000);
    this.syncInterval = setInterval(() => this.syncPendingMetadata(), 30 * 1000);

    // Run immediately
    this.sendHeartbeat();
    this.syncPendingMetadata();
  }

  stop() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.syncInterval) clearInterval(this.syncInterval);
  }

  private async authenticate(): Promise<boolean> {
    try {
      console.log(`🔐 Agent authenticating with cloud gateway at: ${this.apiUrl}`);
      const res = await axios.post(`${this.apiUrl}/auth/login`, {
        email: this.email,
        password: this.passwordPlain,
      });

      if (res.data?.success) {
        this.token = res.data.accessToken;
        console.log('🔒 Agent session authorized successfully');
        return true;
      }
    } catch (err: any) {
      console.error('❌ Agent authentication failed. Please check credentials in configuration.', err.message);
    }
    return false;
  }

  private getAuthHeaders() {
    return {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    };
  }

  async sendHeartbeat() {
    if (!this.token) {
      const auth = await this.authenticate();
      if (!auth) return;
    }

    try {
      const db = await getDatabase();
      const folders = await db.all('SELECT COUNT(*) as count FROM watched_folders');
      const images = await db.all('SELECT COUNT(*) as count FROM local_images');
      const progress = await db.all(`
        SELECT 
          album_id as albumId,
          COUNT(*) as total,
          SUM(CASE WHEN sync_status = 'SYNCED' THEN 1 ELSE 0 END) as synced
        FROM local_images
        GROUP BY album_id
      `);

      const response = await axios.post(
        `${this.apiUrl}/sync/heartbeat`,
        {
          status: 'online',
          watchedFoldersCount: folders[0].count,
          localImagesCount: images[0].count,
          tunnelUrl: TunnelManager.getInstance().getTunnelUrl() || this.tunnelUrl,
          progress,
        },
        this.getAuthHeaders()
      );
      console.log('💓 Heartbeat logged with cloud gateway');

      // Save sync settings locally
      if (response.data?.settings) {
        const { watermarkText } = response.data.settings;
        await db.run(
          'INSERT OR REPLACE INTO local_config (key, value) VALUES (?, ?)',
          ['watermark_text', watermarkText || 'PhotoSelect']
        );
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        console.log('Session expired during heartbeat, re-authenticating...');
        this.token = null;
      } else {
        console.error('⚠️ Failed to post heartbeat to cloud:', err.message);
      }
    }
  }

  async syncPendingMetadata() {
    if (!this.token) {
      const auth = await this.authenticate();
      if (!auth) return;
    }

    try {
      const db = await getDatabase();
      // Load pending images
      const pendingImages = await db.all('SELECT * FROM local_images WHERE sync_status = ? LIMIT 100', ['PENDING']);

      if (pendingImages.length === 0) return;

      console.log(`📤 Found ${pendingImages.length} pending images. Pushing metadata to cloud...`);

      // Group images by album_id
      const groups = pendingImages.reduce((acc: any, img: any) => {
        if (!acc[img.album_id]) acc[img.album_id] = [];
        acc[img.album_id].push(img);
        return acc;
      }, {});

      for (const albumId of Object.keys(groups)) {
        const albumImages = groups[albumId];

        const payload = {
          images: albumImages.map((img: any) => ({
            filename: img.filename,
            localPath: img.local_path,
            relativeStream: img.id, // Use image UUID as relative stream endpoint
            hash: img.hash,
            width: img.width,
            height: img.height,
            fileSize: img.file_size,
            exifData: JSON.parse(img.exif_data || '{}'),
          })),
        };

        try {
          const res = await axios.post(
            `${this.apiUrl}/sync/album/${albumId}/images`,
            payload,
            this.getAuthHeaders()
          );

          if (res.data?.success) {
            // Update status in local SQLite
            const ids = albumImages.map((img: any) => `'${img.id}'`).join(',');
            await db.run(`UPDATE local_images SET sync_status = 'SYNCED' WHERE id IN (${ids})`);
            console.log(`✅ Synced metadata of ${albumImages.length} images for album: ${albumId}`);
          }
        } catch (err: any) {
          if (err.response?.status === 401) {
            this.token = null;
          } else if (err.response?.status === 404) {
            // If the album was deleted on the cloud, mark its local images as ORPHANED so they don't block the queue
            console.warn(`⚠️ Album ${albumId} not found on cloud (404). Marking ${albumImages.length} local images as ORPHANED.`);
            const ids = albumImages.map((img: any) => `'${img.id}'`).join(',');
            await db.run(`UPDATE local_images SET sync_status = 'ORPHANED' WHERE id IN (${ids})`);
          } else {
            console.error(`❌ Sync failed for album ${albumId}:`, err.message);
          }
        }
      }
    } catch (err: any) {
      console.error('❌ Sync pending query failed:', err.message);
    }
  }

  async updateAlbumStatus(albumId: string, status: string) {
    if (!this.token) {
      const auth = await this.authenticate();
      if (!auth) return;
    }
    try {
      await axios.put(
        `${this.apiUrl}/albums/${albumId}/status`,
        { status },
        this.getAuthHeaders()
      );
      console.log(`📡 Album ${albumId} status updated to: ${status}`);
    } catch (err: any) {
      console.error(`⚠️ Failed to update album status on cloud:`, err.message);
    }
  }
}
export default SyncClient;
