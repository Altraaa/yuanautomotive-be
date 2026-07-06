import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import * as path from 'path';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { StorageDriver, StoredObject } from './storage.interface';

/** Writes uploads to a host volume; URL is served by Nginx from MEDIA_PUBLIC_BASE. */
@Injectable()
export class LocalStorageDriver implements StorageDriver {
  private readonly logger = new Logger(LocalStorageDriver.name);
  private readonly uploadDir: string;
  private readonly publicBase: string;

  constructor(config: ConfigService) {
    this.uploadDir = config.get<string>('media.uploadDir') ?? './uploads';
    this.publicBase = (config.get<string>('media.publicBase') ?? '').replace(
      /\/$/,
      '',
    );
  }

  async save(file: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
  }): Promise<StoredObject & { filename: string }> {
    await fs.mkdir(this.uploadDir, { recursive: true });
    const ext = extname(file.originalname).toLowerCase() || '.bin';
    const filename = `${Date.now()}-${uuidv4()}${ext}`;
    const fullPath = path.join(this.uploadDir, filename);
    await fs.writeFile(fullPath, file.buffer);
    return {
      key: filename,
      filename,
      url: `${this.publicBase}/${filename}`,
    };
  }

  async remove(key: string): Promise<void> {
    try {
      await fs.unlink(path.join(this.uploadDir, key));
    } catch (err) {
      // Missing file on delete is non-fatal — log and continue.
      this.logger.warn(`Failed to remove ${key}: ${(err as Error).message}`);
    }
  }
}
