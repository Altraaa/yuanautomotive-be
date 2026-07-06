import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import {
  NotificationChannel,
  NotificationEvent,
  NotificationStatus,
} from '../../../common/enums';

/** Append-only log of every notification attempt (CLAUDE.md §12). No soft delete. */
@Entity('notifications')
export class Notification extends BaseEntity {
  @Column({ type: 'enum', enum: NotificationChannel })
  channel: NotificationChannel;

  @Index('IDX_notifications_event')
  @Column({ type: 'enum', enum: NotificationEvent })
  event: NotificationEvent;

  @Column({ type: 'enum', enum: NotificationStatus })
  status: NotificationStatus;

  /** Recipient (e.g. WhatsApp number). */
  @Column({ type: 'varchar', length: 32, nullable: true })
  target: string | null;

  @Column({ type: 'text' })
  message: string;

  /** UUID of the related contact/order for traceability. */
  @Column({ name: 'related_uuid', type: 'varchar', length: 36, nullable: true })
  related_uuid: string | null;

  @Column({ type: 'text', nullable: true })
  error: string | null;
}
