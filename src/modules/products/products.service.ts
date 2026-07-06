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

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
    private readonly categories: CategoriesService,
    private readonly media: MediaService,
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
    return this.toDetail(product);
  }

  // ── ADMIN ─────────────────────────────────────────
  async adminList(query: ProductQueryDto): Promise<Paginated<ProductDetail>> {
    const qb = this.repo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'category')
      .leftJoinAndSelect('p.images', 'images')
      .orderBy('p.created_at', 'DESC')
      .addOrderBy('images.sort_order', 'ASC');

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
      rows.map((p) => this.toDetail(p)),
      total,
      query.page,
      query.limit,
    );
  }

  async adminDetail(uuid: string): Promise<ProductDetail> {
    return this.toDetail(await this.getOrFail(uuid));
  }

  async create(dto: CreateProductDto): Promise<ProductDetail> {
    const category = await this.categories.getEntityByUuid(dto.category_id);
    const slug = await uniqueSlug(dto.name, (c) => this.slugTaken(c));

    const product = this.repo.create({
      name: dto.name,
      slug,
      price: dto.price,
      badge: dto.badge ?? null,
      description: dto.description,
      compatibility: dto.compatibility,
      specs: this.normalizeSpecs(dto.specs),
      is_featured: dto.is_featured ?? false,
      is_published: dto.is_published ?? true,
      category_id: category.id,
    });
    const saved = await this.repo.save(product);
    await this.media.syncProductImages(saved.id, dto.image_uuids);
    this.revalidate.trigger('products');
    return this.adminDetail(saved.uuid);
  }

  async update(uuid: string, dto: UpdateProductDto): Promise<ProductDetail> {
    const product = await this.getOrFail(uuid);

    if (dto.category_id) {
      const category = await this.categories.getEntityByUuid(dto.category_id);
      product.category_id = category.id;
    }
    if (dto.name && dto.name !== product.name) {
      product.name = dto.name;
      product.slug = await uniqueSlug(dto.name, (c) =>
        this.slugTaken(c, product.id),
      );
    }
    if (dto.price !== undefined) product.price = dto.price;
    if (dto.badge !== undefined) product.badge = dto.badge ?? null;
    if (dto.description !== undefined) product.description = dto.description;
    if (dto.compatibility !== undefined)
      product.compatibility = dto.compatibility;
    if (dto.specs !== undefined) product.specs = this.normalizeSpecs(dto.specs);
    if (dto.is_featured !== undefined) product.is_featured = dto.is_featured;
    if (dto.is_published !== undefined) product.is_published = dto.is_published;

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
      relations: { category: true, images: true },
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

  private sortedImageUrls(product: Product): string[] {
    return (product.images ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((m) => m.url);
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
    const urls = this.sortedImageUrls(product);
    return {
      ...this.toCard(product),
      description: product.description,
      specs: (product.specs ?? [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((s) => ({ label: s.label, value: s.value })),
      compatibility: product.compatibility ?? [],
      gallery: urls,
    };
  }
}
