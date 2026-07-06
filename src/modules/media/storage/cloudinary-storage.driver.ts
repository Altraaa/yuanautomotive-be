import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { StorageDriver, StoredObject } from './storage.interface';

/** Uploads to Cloudinary via unsigned buffer streams; URL is the CDN secure_url. */
@Injectable()
export class CloudinaryStorageDriver implements StorageDriver {
  private readonly logger = new Logger(CloudinaryStorageDriver.name);
  private readonly folder: string;

  constructor(config: ConfigService) {
    cloudinary.config({
      cloud_name: config.get<string>('media.cloudinary.cloudName'),
      api_key: config.get<string>('media.cloudinary.apiKey'),
      api_secret: config.get<string>('media.cloudinary.apiSecret'),
      secure: true,
    });
    this.folder =
      config.get<string>('media.cloudinary.folder') ?? 'yuan-automotive';
  }

  async save(file: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
  }): Promise<StoredObject & { filename: string }> {
    const publicId = `${Date.now()}-${uuidv4()}`;
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: this.folder, public_id: publicId, resource_type: 'auto' },
        (err, res) =>
          err || !res
            ? reject(err ?? new Error('Empty Cloudinary response'))
            : resolve(res),
      );
      stream.end(file.buffer);
    });

    const ext = result.format
      ? `.${result.format}`
      : extname(file.originalname).toLowerCase() || '.bin';
    return {
      key: result.public_id,
      filename: `${publicId}${ext}`,
      url: result.secure_url,
      width: result.width ?? null,
      height: result.height ?? null,
    };
  }

  async remove(key: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(key, { invalidate: true });
    } catch (err) {
      // Missing asset on delete is non-fatal — log and continue.
      this.logger.warn(`Failed to remove ${key}: ${(err as Error).message}`);
    }
  }
}
