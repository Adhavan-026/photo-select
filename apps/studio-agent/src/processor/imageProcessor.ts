import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
// @ts-ignore
import ExifParser from 'exif-parser';

interface ProcessedResult {
  id: string;
  width: number;
  height: number;
  fileSize: number;
  hash: string;
  thumbnailPath: string;
  previewPath: string;
  watermarkPreviewPath: string;
  exifData: any;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

export class ImageProcessor {
  private outputDir: string;

  constructor() {
    this.outputDir = path.resolve(process.env.PREVIEW_DIR || './data/cache');
    this.ensureDirs();
  }

  private ensureDirs() {
    const dirs = ['thumbnails', 'previews', 'watermarked'];
    dirs.forEach((d) => {
      const p = path.join(this.outputDir, d);
      if (!fs.existsSync(p)) {
        fs.mkdirSync(p, { recursive: true });
      }
    });
  }

  private calculateHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', (err) => reject(err));
    });
  }

  async processImage(filePath: string, watermarkText = 'PhotoSelect'): Promise<ProcessedResult> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Original file not found: ${filePath}`);
    }

    const fileStats = fs.statSync(filePath);
    const fileSize = fileStats.size;

    // 1. Calculate file hash to prevent duplicate syncs
    const hash = await this.calculateHash(filePath);
    const id = crypto.randomUUID();

    // 2. Read metadata and extract EXIF
    const metadata = await sharp(filePath).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    let exifData: any = {};
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const parser = ExifParser.create(fileBuffer);
      const result = parser.parse();
      if (result.tags) {
        exifData = {
          camera: result.tags.Model || result.tags.Make,
          lens: result.tags.LensModel,
          iso: result.tags.ISO,
          focalLength: result.tags.FocalLength,
          fNumber: result.tags.FNumber,
          exposureTime: result.tags.ExposureTime,
          createdDate: result.tags.DateTimeOriginal,
        };
      }
    } catch (exifErr) {
      // EXIF parse error, fallback to basic metadata
      exifData = { camera: (metadata as any).make || 'Unknown' };
    }

    // 3. Define output paths
    const thumbName = `${id}_thumb.avif`;
    const previewName = `${id}_prev.avif`;
    const waterName = `${id}_water.avif`;

    const thumbnailPath = path.join(this.outputDir, 'thumbnails', thumbName);
    const previewPath = path.join(this.outputDir, 'previews', previewName);
    const watermarkPreviewPath = path.join(this.outputDir, 'watermarked', waterName);

    // 4. Generate Thumbnail (200px width)
    await sharp(filePath)
      .resize(200, null, { withoutEnlargement: true })
      .toFormat('avif', { quality: 50, speed: 8 })
      .toFile(thumbnailPath);

    // 5. Generate Normal Preview (800px width)
    await sharp(filePath)
      .resize(800, null, { withoutEnlargement: true })
      .toFormat('avif', { quality: 55, speed: 8 })
      .toFile(previewPath);

    // 6. Generate Watermarked AVIF Preview (1920px width)
    // Burn text overlay dynamically into the output image buffer
    const safeWatermarkText = escapeXml(watermarkText);
    const svgOverlay = `
      <svg width="${width > 1920 ? 1920 : width}" height="${height > 1080 ? 1080 : height}">
        <style>
          .watermark {
            fill: rgba(255, 255, 255, 0.25);
            font-family: sans-serif;
            font-size: 48px;
            font-weight: bold;
            text-anchor: middle;
          }
        </style>
        <text x="50%" y="50%" class="watermark" transform="rotate(-30, 960, 540)">
          ${safeWatermarkText} - PREVIEW ONLY
        </text>
      </svg>
    `;

    await sharp(filePath)
      .resize(1920, null, { withoutEnlargement: true })
      .composite([
        {
          input: Buffer.from(svgOverlay),
          gravity: 'center',
        },
      ])
      .toFormat('avif', { quality: 60, speed: 8 })
      .toFile(watermarkPreviewPath);

    return {
      id,
      width,
      height,
      fileSize,
      hash,
      thumbnailPath,
      previewPath,
      watermarkPreviewPath,
      exifData,
    };
  }
}
