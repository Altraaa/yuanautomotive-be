import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { SoftDeletableEntity } from '../../../common/entities/base.entity';
import { ProductBadge } from '../../../common/enums';
import { Category } from '../../categories/entities/category.entity';
import { Media } from '../../media/entities/media.entity';

/** Ordered spec row stored inside the `specs` JSON column (no separate table). */
export interface ProductSpec {
  label: string;
  value: string;
  sort_order: number;
}

@Entity('products')
export class Product extends SoftDeletableEntity {
  @Index('IDX_products_slug', { unique: true })
  @Column({ type: 'varchar', length: 191 })
  slug: string;

  @Column({ type: 'varchar', length: 191 })
  name: string;

  /** decimal → mysql2 returns a string, matching the FE contract (price string). */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: string;

  @Column({ type: 'enum', enum: ProductBadge, nullable: true })
  badge: ProductBadge | null;

  @Column({ type: 'text' })
  description: string;

  /** Dynamic compatibility list, e.g. ["Wuling","Hyundai"] — MySQL JSON, not JSONB. */
  @Column({ type: 'json' })
  compatibility: string[];

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

  @OneToMany(() => Media, (media) => media.product)
  images: Media[];
}
