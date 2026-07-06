import { Exclude } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Generated,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * MANDATORY base for every entity (CLAUDE.md 🧩 ENTITY DESIGN).
 *
 * - `id`   internal auto-increment PK — NEVER exposed externally (@Exclude).
 * - `uuid` public identifier (uuid v4, DB-generated) used in all APIs.
 * - timestamps managed by TypeORM.
 */
export abstract class BaseEntity {
  @Exclude()
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Index('IDX_uuid', { unique: true })
  @Generated('uuid')
  @Column({ type: 'varchar', length: 36 })
  uuid: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updated_at: Date;
}

/**
 * Base for master data that supports soft delete + trash/restore
 * (Category / Product / Blog / Cms). 30-day auto-purge handled by a cron.
 */
export abstract class SoftDeletableEntity extends BaseEntity {
  @Exclude()
  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime', precision: 6, nullable: true })
  deleted_at: Date | null;
}
