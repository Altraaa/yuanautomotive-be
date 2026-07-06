import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { MediaType } from '../../../common/enums';
import { Product } from '../../products/entities/product.entity';

/**
 * Upload record (CLAUDE.md media module). No soft delete — it's a log/asset row.
 * The physical file lives on a volume now; switching to S3 later is a driver swap.
 * Product images are Media rows with a product relation + sort_order.
 */
@Entity('media')
export class Media extends BaseEntity {
  @Column({ type: 'enum', enum: MediaType })
  type: MediaType;

  /** Public URL (served by Nginx from the uploads volume, or S3 later). */
  @Column({ type: 'varchar', length: 512 })
  url: string;

  @Column({ type: 'varchar', length: 255 })
  filename: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 128 })
  mime_type: string;

  @Column({ name: 'size_bytes', type: 'int', unsigned: true })
  size_bytes: number;

  @Column({ type: 'int', unsigned: true, nullable: true })
  width: number | null;

  @Column({ type: 'int', unsigned: true, nullable: true })
  height: number | null;

  /** Storage key/path the driver uses to delete the physical object. */
  @Column({ name: 'storage_key', type: 'varchar', length: 512 })
  storage_key: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sort_order: number;

  @Index('IDX_media_product')
  @ManyToOne(() => Product, (product) => product.images, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'product_id' })
  product: Product | null;

  @Column({ name: 'product_id', type: 'bigint', unsigned: true, nullable: true })
  product_id: string | null;
}
