import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BulkDeleteDto } from '../../common/dto/bulk-delete.dto';
import { ProductBadge } from '../../common/enums';
import {
  buildPaginated,
  Paginated,
} from '../../common/interfaces/paginated.interface';
import { RevalidateService } from '../../common/services/revalidate.service';
import { uniqueSlug } from '../../common/utils/slug.util';
import { CategoriesService } from '../categories/categories.service';
import { MediaService } from '../media/media.service';
import { OrderItem } from '../orders/entities/order-item.entity';
import { UsersService } from '../users/users.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { Product } from './entities/product.entity';

/** Maps the DB badge token to the exact FE JSON value (PRE_ORDER → PRE-ORDER). */
function badgeToJson(badge: ProductBadge | null): string | null {
  if (!badge) return null;
  return badge === ProductBadge.PRE_ORDER ? 'PRE-ORDER' : badge;
}

export interface ProductCard {
  slug: string;
  name: string;
  category: string;
  price: string;
  image_url: string | null;
  badge: string | null;
}

export interface ProductDetail extends ProductCard {
  description: string;
  specs: { label: string; value: string }[];
  compatibility: string[];
  gallery: string[];
}

/** Admin "Kelola Produk" table row (types/ui/admin.ts → AdminProductRow). */
export interface AdminProductRow {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: string;
  badge: string | null;
  status: 'Published' | 'Draft';
}

/** One existing product image, exposed to the admin edit form so old photos
 *  can be previewed as deletable thumbnails and kept/dropped by uuid on save. */
export interface GalleryMediaItem {
  uuid: string;
  url: string;
}

/** Rich admin detail (BACKEND-GUIDE §5.2 → AdminProductDetail). */
export interface AdminProductDetail {
  id: string;
  slug: string;
  sku: string;
  name: string;
  category: string;
  category_id: string;
  price: string;
  price_wholesale: string | null;
  stock: number;
  badge: string | null;
  is_published: boolean;
  is_featured: boolean;
  description: string;
  specs: { label: string; value: string }[];
  compatibility: string[];
  gallery: string[];
  /** Same images as `gallery`, but each carries its media uuid so the edit
   *  form can render deletable thumbnails and re-send the kept uuids on save. */
  gallery_media: GalleryMediaItem[];
  view_count: number;
  lead_count: number;
  preorder_count: number;
  author: string;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
    @InjectRepository(OrderItem)
    private readonly orderItems: Repository<OrderItem>,
    private readonly categories: CategoriesService,
    private readonly media: MediaService,
    private readonly users: UsersService,
    private readonly revalidate: RevalidateService,
  ) {}

  // ── PUBLIC ────────────────────────────────────────
  async listPublic(query: ProductQueryDto): Promise<Paginated<ProductCard>> {
    const qb = this.repo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'category')
      .leftJoinAndSelect('p.images', 'images')
      .where('p.is_published = :pub', { pub: true });

    if (query.category) {
      qb.andWhere('(category.slug = :cat OR category.name = :cat)', {
        cat: query.category,
      });
    }
    if (query.price_min) {
      qb.andWhere('p.price >= :min', { min: query.price_min });
    }
    if (query.price_max) {
      qb.andWhere('p.price <= :max', { max: query.price_max });
    }

    switch (query.sort) {
      case 'termurah':
        qb.orderBy('p.price', 'ASC');
        break;
      case 'termahal':
        qb.orderBy('p.price', 'DESC');
        break;
      default:
        qb.orderBy('p.created_at', 'DESC');
    }
    qb.addOrderBy('images.sort_order', 'ASC');

    const [rows, total] = await qb
      .skip(query.skip)
      .take(query.limit)
      .getManyAndCount();

    return buildPaginated(
      rows.map((p) => this.toCard(p)),
      total,
      query.page,
      query.limit,
    );
  }

  async detailBySlug(slug: string): Promise<ProductDetail> {
    const product = await this.repo.findOne({
      where: { slug, is_published: true },
      relations: { category: true, images: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    // Fire-and-forget view counter; never block the response on it.
    void this.repo.increment({ id: product.id }, 'view_count', 1);
    return this.toDetail(product);
  }

  // ── ADMIN ─────────────────────────────────────────
  async adminList(query: ProductQueryDto): Promise<Paginated<AdminProductRow>> {
    const qb = this.repo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'category')
      .orderBy('p.created_at', 'DESC');

    if (query.category) {
      qb.andWhere('(category.slug = :cat OR category.name = :cat)', {
        cat: query.category,
      });
    }

    const [rows, total] = await qb
      .skip(query.skip)
      .take(query.limit)
      .getManyAndCount();

    return buildPaginated(
      rows.map((p) => this.toAdminRow(p)),
      total,
      query.page,
      query.limit,
    );
  }

  async adminDetail(uuid: string): Promise<AdminProductDetail> {
    return this.toAdminDetail(await this.getOrFail(uuid));
  }

  async create(
    dto: CreateProductDto,
    authorUuid?: string,
  ): Promise<AdminProductDetail> {
    const category = await this.categories.getEntityByUuid(dto.category_id);
    await this.ensureSkuFree(dto.sku);
    const slug = await uniqueSlug(dto.slug?.trim() || dto.name, (c) =>
      this.slugTaken(c),
    );
    const authorId = await this.resolveAuthorId(authorUuid);

    const product = this.repo.create({
      name: dto.name,
      sku: dto.sku,
      slug,
      price: dto.price,
      price_wholesale: dto.price_wholesale ?? null,
      stock: dto.stock ?? 0,
      badge: dto.badge ?? null,
      description: dto.description,
      compatibility: dto.compatibility,
      specs: this.normalizeSpecs(dto.specs),
      is_featured: dto.is_featured ?? false,
      is_published: dto.is_published ?? true,
      category_id: category.id,
      author_id: authorId,
    });
    const saved = await this.repo.save(product);
    if (dto.image_uuids?.length) {
      await this.media.syncProductImages(saved.id, dto.image_uuids);
    }
    this.revalidate.trigger('products');
    return this.adminDetail(saved.uuid);
  }

  async update(
    uuid: string,
    dto: UpdateProductDto,
    authorUuid?: string,
  ): Promise<AdminProductDetail> {
    const product = await this.getOrFail(uuid);

    if (dto.category_id) {
      const category = await this.categories.getEntityByUuid(dto.category_id);
      product.category_id = category.id;
    }
    if (dto.sku !== undefined && dto.sku !== product.sku) {
      await this.ensureSkuFree(dto.sku, product.id);
      product.sku = dto.sku;
    }
    if (dto.name !== undefined) product.name = dto.name;
    // Slug: explicit value wins; empty string or a renamed product regenerates.
    if (dto.slug !== undefined && dto.slug.trim()) {
      product.slug = await uniqueSlug(dto.slug.trim(), (c) =>
        this.slugTaken(c, product.id),
      );
    } else if (
      (dto.slug !== undefined && !dto.slug.trim()) ||
      (dto.name !== undefined && dto.name !== product.name)
    ) {
      product.slug = await uniqueSlug(product.name, (c) =>
        this.slugTaken(c, product.id),
      );
    }
    if (dto.price !== undefined) product.price = dto.price;
    if (dto.price_wholesale !== undefined)
      product.price_wholesale = dto.price_wholesale ?? null;
    if (dto.stock !== undefined) product.stock = dto.stock;
    if (dto.badge !== undefined) product.badge = dto.badge ?? null;
    if (dto.description !== undefined) product.description = dto.description;
    if (dto.compatibility !== undefined)
      product.compatibility = dto.compatibility;
    if (dto.specs !== undefined) product.specs = this.normalizeSpecs(dto.specs);
    if (dto.is_featured !== undefined) product.is_featured = dto.is_featured;
    if (dto.is_published !== undefined) product.is_published = dto.is_published;

    const authorId = await this.resolveAuthorId(authorUuid);
    if (authorId) product.author_id = authorId;

    await this.repo.save(product);
    if (dto.image_uuids) {
      await this.media.syncProductImages(product.id, dto.image_uuids);
    }
    this.revalidate.trigger('products');
    return this.adminDetail(product.uuid);
  }

  async remove(uuid: string): Promise<void> {
    const product = await this.getOrFail(uuid);
    await this.repo.softRemove(product);
    this.revalidate.trigger('products');
  }

  async bulkDelete(dto: BulkDeleteDto): Promise<{ deleted: number }> {
    const products = await this.repo.find({ where: { uuid: In(dto.ids) } });
    if (products.length) await this.repo.softRemove(products);
    this.revalidate.trigger('products');
    return { deleted: products.length };
  }

  // ── helpers ───────────────────────────────────────
  private async getOrFail(uuid: string): Promise<Product> {
    const product = await this.repo.findOne({
      where: { uuid },
      relations: { category: true, images: true, author: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  private normalizeSpecs(specs: CreateProductDto['specs']) {
    return specs
      .map((s, i) => ({
        label: s.label,
        value: s.value,
        sort_order: s.sort_order ?? i,
      }))
      .sort((a, b) => a.sort_order - b.sort_order);
  }

  private async slugTaken(slug: string, exceptId?: string): Promise<boolean> {
    const qb = this.repo
      .createQueryBuilder('p')
      .withDeleted()
      .where('p.slug = :slug', { slug });
    if (exceptId) qb.andWhere('p.id != :id', { id: exceptId });
    return (await qb.getCount()) > 0;
  }

  private async ensureSkuFree(sku: string, exceptId?: string): Promise<void> {
    const qb = this.repo
      .createQueryBuilder('p')
      .withDeleted()
      .where('p.sku = :sku', { sku });
    if (exceptId) qb.andWhere('p.id != :id', { id: exceptId });
    if (await qb.getCount()) {
      throw new NotFoundException(`SKU "${sku}" already exists`);
    }
  }

  private async resolveAuthorId(uuid?: string): Promise<string | null> {
    if (!uuid) return null;
    const user = await this.users.findByUuid(uuid);
    return user?.id ?? null;
  }

  /** Number of distinct pre-orders that reference this product. */
  private async preorderCount(productId: string): Promise<number> {
    const raw = await this.orderItems
      .createQueryBuilder('i')
      .select('COUNT(DISTINCT i.order_id)', 'count')
      .where('i.product_id = :id', { id: productId })
      .getRawOne<{ count: string }>();
    return Number(raw?.count ?? 0);
  }

  private sortedImages(product: Product) {
    return (product.images ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order);
  }

  private sortedImageUrls(product: Product): string[] {
    return this.sortedImages(product).map((m) => m.url);
  }

  private sortedGalleryMedia(product: Product): GalleryMediaItem[] {
    return this.sortedImages(product).map((m) => ({
      uuid: m.uuid,
      url: m.url,
    }));
  }

  private mapSpecs(product: Product) {
    return (product.specs ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((s) => ({ label: s.label, value: s.value }));
  }

  private toCard(product: Product): ProductCard {
    const urls = this.sortedImageUrls(product);
    return {
      slug: product.slug,
      name: product.name,
      category: product.category?.name ?? '',
      price: product.price,
      image_url: urls[0] ?? null,
      badge: badgeToJson(product.badge),
    };
  }

  private toDetail(product: Product): ProductDetail {
    return {
      ...this.toCard(product),
      description: product.description,
      specs: this.mapSpecs(product),
      compatibility: product.compatibility ?? [],
      gallery: this.sortedImageUrls(product),
    };
  }

  private toAdminRow(product: Product): AdminProductRow {
    return {
      id: product.uuid,
      name: product.name,
      sku: product.sku,
      category: product.category?.name ?? '',
      price: product.price,
      badge: badgeToJson(product.badge),
      status: product.is_published ? 'Published' : 'Draft',
    };
  }

  private async toAdminDetail(product: Product): Promise<AdminProductDetail> {
    // lead_count has no product relation yet (contacts are free-text) → 0.
    const preorder_count = await this.preorderCount(product.id);
    return {
      id: product.uuid,
      slug: product.slug,
      sku: product.sku,
      name: product.name,
      category: product.category?.name ?? '',
      category_id: product.category?.uuid ?? '',
      price: product.price,
      price_wholesale: product.price_wholesale ?? null,
      stock: product.stock,
      badge: badgeToJson(product.badge),
      is_published: product.is_published,
      is_featured: product.is_featured,
      description: product.description,
      specs: this.mapSpecs(product),
      compatibility: product.compatibility ?? [],
      gallery: this.sortedImageUrls(product),
      gallery_media: this.sortedGalleryMedia(product),
      view_count: product.view_count,
      lead_count: 0,
      preorder_count,
      author: product.author?.name ?? '',
      created_at: product.created_at.toISOString(),
      updated_at: product.updated_at.toISOString(),
    };
  }
}
