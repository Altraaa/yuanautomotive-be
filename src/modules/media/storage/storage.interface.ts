export const STORAGE_DRIVER = 'STORAGE_DRIVER';

export interface StoredObject {
  /** Key/path used later to delete the object. */
  key: string;
  /** Public URL clients use to fetch it. */
  url: string;
  /** Image dimensions if the driver knows them (Cloudinary does; local doesn't). */
  width?: number | null;
  height?: number | null;
}

/**
 * Storage abstraction. LocalStorageDriver / CloudinaryStorageDriver are selected
 * by MEDIA_STORAGE without touching MediaService (CLAUDE.md §3 — driver swap, not rewrite).
 */
export interface StorageDriver {
  save(file: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
  }): Promise<StoredObject & { filename: string }>;

  remove(key: string): Promise<void>;
}
