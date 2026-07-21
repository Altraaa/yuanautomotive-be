import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { SoftDeletableEntity } from '../../../common/entities/base.entity';
import { ProductBadge } from '../../../common/enums';
import { Category } from '../../categories/entities/category.entity';
import { Media } from '../../media/entities/media.entity';
import { User } from '../../users/entities/user.entity';

/** Ordered spec row stored inside the `specs` JSON column (no separate table). */
export interface ProductSpec {
  label: string;
  value: string;
  sort_order: number;
}

/** One structured vehicle-fitment row stored inside the `compatibility` JSON
 *  column (no separate table). `brand`/`model` are required; `years` is a free
 *  text range and is omitted when unknown. Array order is the admin's choice. */
export interface ProductFitment {
  brand: string;
  model: string;
  years?: string;
}

@Entity('products')
export class Product extends SoftDeletableEntity {
  @Index('IDX_products_slug', { unique: true })
  @Column({ type: 'varchar', length: 191 })
  slug: string;

  /** Internal stock code shown in admin only (unique). */
  @Index('IDX_products_sku', { unique: true })
  @Column({ type: 'varchar', length: 64 })
  sku: string;

  @Column({ type: 'varchar', length: 191 })
  name: string;

  /** decimal → mysql2 returns a string, matching the FE contract (price string). */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: string;

  /** Grosir price — admin only, nullable. String like `price`. */
  @Column({
    name: 'price_wholesale',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  price_wholesale: string | null;

  /** On-hand units — admin only. */
  @Column({ type: 'int', unsigned: true, default: 0 })
  stock: number;

  /** Public detail view counter — feeds the admin "Dilihat" stat. */
  @Column({ name: 'view_count', type: 'int', unsigned: true, default: 0 })
  view_count: number;

  @Column({ type: 'enum', enum: ProductBadge, nullable: true })
  badge: ProductBadge | null;

  @Column({ type: 'text' })
  description: string;

  /** Structured vehicle fitment list ({ brand, model, years? }) — MySQL JSON,
   *  not JSONB. Order preserved. See ProductFitment. */
  @Column({ type: 'json' })
  compatibility: ProductFitment[];

  /** Ordered key/value specs — MySQL JSON per CLAUDE.md (dynamic specs). */
  @Column({ type: 'json' })
  specs: ProductSpec[];

  @Column({ name: 'is_featured', type: 'boolean', default: false })
  is_featured: boolean;

  @Column({ name: 'is_published', type: 'boolean', default: true })
  is_published: boolean;

  @Index('IDX_products_category')
  @ManyToOne(() => Category, (category) => category.products, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ name: 'category_id', type: 'bigint', unsigned: true })
  category_id: string;

  /** User who last created/updated this product → detail "Oleh". */
  @Index('IDX_products_author')
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'author_id' })
  author: User | null;

  @Column({ name: 'author_id', type: 'bigint', unsigned: true, nullable: true })
  author_id: string | null;

  @OneToMany(() => Media, (media) => media.product)
  images: Media[];
}
