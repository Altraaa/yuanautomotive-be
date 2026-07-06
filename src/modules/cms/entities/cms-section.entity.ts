import { Column, Entity, Index } from 'typeorm';
import { SoftDeletableEntity } from '../../../common/entities/base.entity';

/** Single key-value table for dynamic FE content (CLAUDE.md cms module). */
@Entity('cms_sections')
export class CmsSection extends SoftDeletableEntity {
  @Index('IDX_cms_key', { unique: true })
  @Column({ name: 'section_key', type: 'varchar', length: 120 })
  key: string;

  /** Flexible content blob per section — MySQL JSON (not JSONB). */
  @Column({ name: 'content_json', type: 'json' })
  data: Record<string, unknown>;
}
