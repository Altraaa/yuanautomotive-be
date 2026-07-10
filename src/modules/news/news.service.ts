import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BulkDeleteDto } from '../../common/dto/bulk-delete.dto';
import {
  buildPaginated,
  Paginated,
} from '../../common/interfaces/paginated.interface';
import { RevalidateService } from '../../common/services/revalidate.service';
import { uniqueSlug } from '../../common/utils/slug.util';
import { MediaService } from '../media/media.service';
import { CreateNewsDto, UpdateNewsDto } from './dto/news.dto';
import { NewsQueryDto } from './dto/news-query.dto';
import { News } from './entities/news.entity';
import { newsTypeFromJson, newsTypeToJson } from './news.mapper';

/** Public card (§3.1). */
export interface NewsCard {
  slug: string;
  title: string;
  type: string;
  thumbnail_url: string | null;
  instagram_url: string;
  published_at: string | null;
  mark_new: boolean;
}

/** Admin list row (§3.2) — superset of the public card. */
export interface AdminNewsRow extends NewsCard {
  id: string;
  is_published: boolean;
}

/** Public detail (§4.1). */
export interface NewsDetail extends NewsCard {
  caption: string;
}

/** Admin detail (§4.2) — editor payload incl. draft + thumbnail_uuid. */
export interface AdminNewsDetail extends NewsDetail {
  id: string;
  is_published: boolean;
  thumbnail_uuid: string | null;
}

@Injectable()
export class NewsService {
  constructor(
    @InjectRepository(News)
    private readonly repo: Repository<News>,
    private readonly media: MediaService,
    private readonly revalidate: RevalidateService,
  ) {}

  // ── PUBLIC ────────────────────────────────────────
  async listPublic(query: NewsQueryDto): Promise<Paginated<NewsCard>> {
    const qb = this.baseQuery(query)
      .where('n.is_published = :pub', { pub: true })
      .orderBy('n.published_at', 'DESC');

    const [rows, total] = await qb
      .skip(query.skip)
      .take(query.limit)
      .getManyAndCount();

    return buildPaginated(
      rows.map((n) => this.toCard(n)),
      total,
      query.page,
      query.limit,
    );
  }

  async detailBySlug(slug: string): Promise<NewsDetail> {
    const news = await this.repo.findOne({
      where: { slug, is_published: true },
      relations: { thumbnail: true },
    });
    if (!news) throw new NotFoundException('News not found');
    return this.toDetail(news);
  }

  // ── ADMIN ─────────────────────────────────────────
  async adminList(query: NewsQueryDto): Promise<Paginated<AdminNewsRow>> {
    const qb = this.baseQuery(query).orderBy('n.created_at', 'DESC');

    const [rows, total] = await qb
      .skip(query.skip)
      .take(query.limit)
      .getManyAndCount();

    return buildPaginated(
      rows.map((n) => this.toRow(n)),
      total,
      query.page,
      query.limit,
    );
  }

  async adminDetail(uuid: string): Promise<AdminNewsDetail> {
    return this.toAdminDetail(await this.getOrFail(uuid));
  }

  async create(dto: CreateNewsDto): Promise<AdminNewsDetail> {
    const slug = await uniqueSlug(dto.title, (c) => this.slugTaken(c));
    const thumbnailId = dto.thumbnail_uuid
      ? (await this.media.findByUuidOrFail(dto.thumbnail_uuid)).id
      : null;

    const isPublished = dto.is_published ?? false;
    const news = this.repo.create({
      slug,
      title: dto.title,
      type: newsTypeFromJson(dto.type),
      caption: dto.caption,
      instagram_url: dto.instagram_url,
      mark_new: dto.mark_new ?? false,
      is_published: isPublished,
      published_at: this.resolvePublishedAt(isPublished, dto.published_at, null),
      thumbnail_media_id: thumbnailId,
    });

    const saved = await this.repo.save(news);
    this.revalidate.trigger('news');
    return this.adminDetail(saved.uuid);
  }

  async update(uuid: string, dto: UpdateNewsDto): Promise<AdminNewsDetail> {
    const news = await this.getOrFail(uuid);

    if (dto.title && dto.title !== news.title) {
      news.title = dto.title;
      news.slug = await uniqueSlug(dto.title, (c) =>
        this.slugTaken(c, news.id),
      );
    }
    if (dto.type !== undefined) news.type = newsTypeFromJson(dto.type);
    if (dto.caption !== undefined) news.caption = dto.caption;
    if (dto.instagram_url !== undefined)
      news.instagram_url = dto.instagram_url;
    if (dto.mark_new !== undefined) news.mark_new = dto.mark_new;
    if (dto.is_published !== undefined) news.is_published = dto.is_published;
    // Keep published_at consistent with the (possibly new) publish state. The FE
    // only sends published_at when publishing; a draft leaves it null.
    news.published_at = this.resolvePublishedAt(
      news.is_published,
      dto.published_at,
      news.published_at,
    );
    if (dto.thumbnail_uuid !== undefined) {
      news.thumbnail_media_id = dto.thumbnail_uuid
        ? (await this.media.findByUuidOrFail(dto.thumbnail_uuid)).id
        : null;
    }

    await this.repo.save(news);
    this.revalidate.trigger('news');
    return this.adminDetail(news.uuid);
  }

  async remove(uuid: string): Promise<void> {
    const news = await this.getOrFail(uuid);
    await this.repo.softRemove(news);
    this.revalidate.trigger('news');
  }

  async bulkDelete(dto: BulkDeleteDto): Promise<{ deleted: number }> {
    const rows = await this.repo.find({ where: { uuid: In(dto.ids) } });
    if (rows.length) await this.repo.softRemove(rows);
    this.revalidate.trigger('news');
    return { deleted: rows.length };
  }

  // ── helpers ───────────────────────────────────────
  private baseQuery(query: NewsQueryDto) {
    const qb = this.repo
      .createQueryBuilder('n')
      .leftJoinAndSelect('n.thumbnail', 'thumbnail');
    if (query.type) {
      qb.andWhere('n.type = :type', { type: newsTypeFromJson(query.type) });
    }
    return qb;
  }

  private async getOrFail(uuid: string): Promise<News> {
    const news = await this.repo.findOne({
      where: { uuid },
      relations: { thumbnail: true },
    });
    if (!news) throw new NotFoundException('News not found');
    return news;
  }

  private async slugTaken(slug: string, exceptId?: string): Promise<boolean> {
    const qb = this.repo
      .createQueryBuilder('n')
      .withDeleted()
      .where('n.slug = :slug', { slug });
    if (exceptId) qb.andWhere('n.id != :id', { id: exceptId });
    return (await qb.getCount()) > 0;
  }

  /**
   * When publishing: use the provided date, else the existing one, else now.
   * When a draft: keep null (published_at only exists for published news).
   */
  private resolvePublishedAt(
    isPublished: boolean,
    provided: string | undefined,
    current: Date | null,
  ): Date | null {
    if (!isPublished) return null;
    if (provided) return new Date(provided);
    return current ?? new Date();
  }

  private toIsoDate(d: Date | null): string | null {
    return d ? d.toISOString().slice(0, 10) : null;
  }

  private toCard(news: News): NewsCard {
    return {
      slug: news.slug,
      title: news.title,
      type: newsTypeToJson(news.type),
      thumbnail_url: news.thumbnail?.url ?? null,
      instagram_url: news.instagram_url,
      published_at: this.toIsoDate(news.published_at),
      mark_new: news.mark_new,
    };
  }

  private toRow(news: News): AdminNewsRow {
    return {
      ...this.toCard(news),
      id: news.uuid,
      is_published: news.is_published,
    };
  }

  private toDetail(news: News): NewsDetail {
    return { ...this.toCard(news), caption: news.caption };
  }

  private toAdminDetail(news: News): AdminNewsDetail {
    return {
      ...this.toDetail(news),
      id: news.uuid,
      is_published: news.is_published,
      thumbnail_uuid: news.thumbnail?.uuid ?? null,
    };
  }
}
