import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Product } from '../../products/entities/product.entity';
import { Order } from './order.entity';

/** Line item with product snapshots so history survives product deletion. */
@Entity('order_items')
export class OrderItem extends BaseEntity {
  @Index('IDX_order_items_order')
  @ManyToOne(() => Order, (order) => order.items, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'order_id', type: 'bigint', unsigned: true })
  order_id: string;

  /** Null if the product is later deleted (snapshot fields still hold the info). */
  @ManyToOne(() => Product, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'product_id' })
  product: Product | null;

  @Column({ name: 'product_id', type: 'bigint', unsigned: true, nullable: true })
  product_id: string | null;

  @Column({ name: 'product_slug', type: 'varchar', length: 191 })
  product_slug: string;

  @Column({ name: 'product_name', type: 'varchar', length: 191 })
  product_name: string;

  @Column({ name: 'price_snapshot', type: 'decimal', precision: 12, scale: 2 })
  price_snapshot: string;

  @Column({ type: 'int', unsigned: true })
  quantity: number;
}
