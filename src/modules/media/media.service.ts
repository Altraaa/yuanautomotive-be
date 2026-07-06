import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { MediaType } from '../../common/enums';
import { Media } from './entities/media.entity';
import { STORAGE_DRIVER, StorageDriver } from './storage/storage.interface';

const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const PDF_MIME = 'application/pdf';

export interface MediaResponse {
  id: string;
  url: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
}

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(Media)
    private readonly repo: Repository<Media>,
    @Inject(STORAGE_DRIVER)
    private readonly storage: StorageDriver,
    private readonly config: ConfigService,
  ) {}

  async upload(file: Express.Multer.File): Promise<MediaResponse> {
    if (!file) throw new BadRequestException('file is required');

    const maxBytes =
      (this.config.get<number>('media.maxSizeMb') ?? 10) * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new BadRequestException('File exceeds max allowed size');
    }

    const type = this.resolveType(file.mimetype);
    const stored = await this.storage.save({
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
    });

    const media = this.repo.create({
      type,
      url: stored.url,
      filename: stored.filename,
      storage_key: stored.key,
      mime_type: file.mimetype,
      size_bytes: file.size,
      width: stored.width ?? null,
      height: stored.height ?? null,
    });
    const saved = await this.repo.save(media);
    return this.toResponse(saved);
  }

  /** Bulk upload — each file goes through the same validation as `upload`. */
  async uploadMany(files: Express.Multer.File[]): Promise<MediaResponse[]> {
    if (!files?.length) throw new BadRequestException('files are required');
    return Promise.all(files.map((file) => this.upload(file)));
  }

  async remove(uuid: string): Promise<void> {
    const media = await this.repo.findOne({ where: { uuid } });
    if (!media) throw new NotFoundException('Media not found');
    await this.storage.remove(media.storage_key);
    await this.repo.remove(media);
  }

  /** Resolves upload UUIDs → Media rows, preserving the caller's order. */
  async resolveByUuids(uuids: string[]): Promise<Media[]> {
    if (!uuids?.length) return [];
    const found = await this.repo.find({ where: { uuid: In(uuids) } });
    const byUuid = new Map(found.map((m) => [m.uuid, m]));
    const ordered: Media[] = [];
    uuids.forEach((u) => {
      const m = byUuid.get(u);
      if (!m) throw new NotFoundException(`Media not found: ${u}`);
      ordered.push(m);
    });
    return ordered;
  }

  async findByUuidOrFail(uuid: string): Promise<Media> {
    const media = await this.repo.findOne({ where: { uuid } });
    if (!media) throw new NotFoundException(`Media not found: ${uuid}`);
    return media;
  }

  /**
   * Re-links a product's images to exactly `uuids`, in order.
   * Previously-attached media are detached (product_id → null) but not deleted.
   */
  async syncProductImages(
    productId: string,
    uuids: string[],
  ): Promise<Media[]> {
    const media = await this.resolveByUuids(uuids);
    await this.repo.update({ product_id: productId }, { product_id: null });
    await Promise.all(
      media.map((m, index) =>
        this.repo.update(
          { id: m.id },
          { product_id: productId, sort_order: index },
        ),
      ),
    );
    return this.repo.find({
      where: { product_id: productId },
      order: { sort_order: 'ASC' },
    });
  }

  private resolveType(mime: string): MediaType {
    if (IMAGE_MIMES.includes(mime)) return MediaType.IMAGE;
    if (mime === PDF_MIME) return MediaType.PDF;
    throw new BadRequestException(`Unsupported file type: ${mime}`);
  }

  toResponse(m: Media): MediaResponse {
    return {
      id: m.uuid,
      url: m.url,
      filename: m.filename,
      mime_type: m.mime_type,
      size_bytes: m.size_bytes,
      width: m.width,
      height: m.height,
    };
  }
}
