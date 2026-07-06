import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { OrderStatus } from '../../../common/enums';
import { OrderItem } from './order-item.entity';

/** Pre-order (no payment gateway). No soft delete. */
@Entity('orders')
export class Order extends BaseEntity {
  @Column({ name: 'customer_name', type: 'varchar', length: 191 })
  customer_name: string;

  @Column({ type: 'varchar', length: 32 })
  phone: string;

  @Column({ type: 'varchar', length: 191, nullable: true })
  email: string | null;

  @Column({ name: 'vehicle_model', type: 'varchar', length: 191, nullable: true })
  vehicle_model: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Index('IDX_orders_status')
  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.NEW })
  status: OrderStatus;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];
}
