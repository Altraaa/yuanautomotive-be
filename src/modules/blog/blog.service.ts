import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import sanitizeHtml from 'sanitize-html';
import { In, Repository } from 'typeorm';
import { BulkDeleteDto } from '../../common/dto/bulk-delete.dto';
import {
  buildPaginated,
  Paginated,
} from '../../common/interfaces/paginated.interface';
import { RevalidateService } from '../../common/services/revalidate.service';
import { uniqueSlug } from '../../common/utils/slug.util';
import { MediaService } from '../media/media.service';
import {
  blogCategoryFromJson,
  blogCategoryToJson,
} from './blog.mapper';
import { CreateBlogDto, UpdateBlogDto } from './dto/blog.dto';
import { BlogQueryDto } from './dto/blog-query.dto';
import { Blog } from './entities/blog.entity';

export interface BlogCard {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  image_url: string | null;
  published_at: string;
  reading_minutes: number;
}

export interface BlogDetail extends BlogCard {
  content_html: string;
  author: string;
}

/** Conservative Tiptap-friendly allowlist to prevent stored XSS (§8). */
const SANITIZE_OPTS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'br', 'strong', 'em', 'u', 's', 'blockquote', 'code', 'pre',
    'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'a', 'img', 'hr',
    'figure', 'figcaption', 'span',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    span: ['class'],
    '*': ['class'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
  },
};

@Injectable()
export class BlogService {
  constructor(
    @InjectRepository(Blog)
    private readonly repo: Repository<Blog>,
    private readonly media: MediaService,
    private readonly revalidate: RevalidateService,
  ) {}

  // ── PUBLIC ────────────────────────────────────────
  async listPublic(query: BlogQueryDto): Promise<Paginated<BlogCard>> {
    const qb = this.repo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.cover', 'cover')
      .where('b.is_published = :pub', { pub: true })
      .orderBy('b.published_at', 'DESC');

    if (query.category) {
      qb.andWhere('b.category = :cat', {
        cat: blogCategoryFromJson(query.category),
      });
    }

    const [rows, total] = await qb
      .skip(query.skip)
      .take(query.limit)
      .getManyAndCount();

    return buildPaginated(
      rows.map((b) => this.toCard(b)),
      total,
      query.page,
      query.limit,
    );
  }

  async detailBySlug(slug: string): Promise<BlogDetail> {
    const blog = await this.repo.findOne({
      where: { slug, is_published: true },
      relations: { cover: true },
    });
    if (!blog) throw new NotFoundException('Blog not found');
    return this.toDetail(blog);
  }

  // ── ADMIN ─────────────────────────────────────────
  async adminDetail(uuid: string): Promise<BlogDetail> {
    return this.toDetail(await this.getOrFail(uuid));
  }

  async create(dto: CreateBlogDto): Promise<BlogDetail> {
    const slug = await uniqueSlug(dto.title, (c) => this.slugTaken(c));
    const coverId = dto.cover_uuid
      ? (await this.media.findByUuidOrFail(dto.cover_uuid)).id
      : null;

    const blog = this.repo.create({
      slug,
      title: dto.title,
      category: blogCategoryFromJson(dto.category),
      excerpt: dto.excerpt,
      content_html: sanitizeHtml(dto.content_html, SANITIZE_OPTS),
      author: dto.author,
      reading_minutes: dto.reading_minutes,
      is_published: dto.is_published ?? true,
      published_at: new Date(dto.published_at),
      cover_media_id: coverId,
    });
    const saved = await this.repo.save(blog);
    this.revalidate.trigger('blogs');
    return this.adminDetail(saved.uuid);
  }

  async update(uuid: string, dto: UpdateBlogDto): Promise<BlogDetail> {
    const blog = await this.getOrFail(uuid);

    if (dto.title && dto.title !== blog.title) {
      blog.title = dto.title;
      blog.slug = await uniqueSlug(dto.title, (c) =>
        this.slugTaken(c, blog.id),
      );
    }
    if (dto.category !== undefined)
      blog.category = blogCategoryFromJson(dto.category);
    if (dto.excerpt !== undefined) blog.excerpt = dto.excerpt;
    if (dto.content_html !== undefined)
      blog.content_html = sanitizeHtml(dto.content_html, SANITIZE_OPTS);
    if (dto.author !== undefined) blog.author = dto.author;
    if (dto.reading_minutes !== undefined)
      blog.reading_minutes = dto.reading_minutes;
    if (dto.is_published !== undefined) blog.is_published = dto.is_published;
    if (dto.published_at !== undefined)
      blog.published_at = new Date(dto.published_at);
    if (dto.cover_uuid !== undefined) {
      blog.cover_media_id = dto.cover_uuid
        ? (await this.media.findByUuidOrFail(dto.cover_uuid)).id
        : null;
    }

    await this.repo.save(blog);
    this.revalidate.trigger('blogs');
    return this.adminDetail(blog.uuid);
  }

  async remove(uuid: string): Promise<void> {
    const blog = await this.getOrFail(uuid);
    await this.repo.softRemove(blog);
    this.revalidate.trigger('blogs');
  }

  async bulkDelete(dto: BulkDeleteDto): Promise<{ deleted: number }> {
    const blogs = await this.repo.find({ where: { uuid: In(dto.ids) } });
    if (blogs.length) await this.repo.softRemove(blogs);
    this.revalidate.trigger('blogs');
    return { deleted: blogs.length };
  }

  // ── helpers ───────────────────────────────────────
  private async getOrFail(uuid: string): Promise<Blog> {
    const blog = await this.repo.findOne({
      where: { uuid },
      relations: { cover: true },
    });
    if (!blog) throw new NotFoundException('Blog not found');
    return blog;
  }

  private async slugTaken(slug: string, exceptId?: string): Promise<boolean> {
    const qb = this.repo
      .createQueryBuilder('b')
      .withDeleted()
      .where('b.slug = :slug', { slug });
    if (exceptId) qb.andWhere('b.id != :id', { id: exceptId });
    return (await qb.getCount()) > 0;
  }

  private toIsoDate(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  private toCard(blog: Blog): BlogCard {
    return {
      slug: blog.slug,
      title: blog.title,
      category: blogCategoryToJson(blog.category),
      excerpt: blog.excerpt,
      image_url: blog.cover?.url ?? null,
      published_at: this.toIsoDate(blog.published_at),
      reading_minutes: blog.reading_minutes,
    };
  }

  private toDetail(blog: Blog): BlogDetail {
    return {
      ...this.toCard(blog),
      content_html: blog.content_html,
      author: blog.author,
    };
  }
}
