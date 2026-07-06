import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { SoftDeletableEntity } from '../../../common/entities/base.entity';
import { BlogCategory } from '../../../common/enums';
import { Media } from '../../media/entities/media.entity';

@Entity('blogs')
export class Blog extends SoftDeletableEntity {
  @Index('IDX_blogs_slug', { unique: true })
  @Column({ type: 'varchar', length: 191 })
  slug: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'enum', enum: BlogCategory })
  category: BlogCategory;

  @Column({ type: 'varchar', length: 500 })
  excerpt: string;

  /** Sanitized Tiptap HTML. */
  @Column({ name: 'content_html', type: 'longtext' })
  content_html: string;

  @Column({ type: 'varchar', length: 191 })
  author: string;

  @Column({ name: 'reading_minutes', type: 'smallint', unsigned: true, default: 1 })
  reading_minutes: number;

  @Column({ name: 'is_published', type: 'boolean', default: true })
  is_published: boolean;

  @Column({ name: 'published_at', type: 'datetime', precision: 6 })
  published_at: Date;

  @ManyToOne(() => Media, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'cover_media_id' })
  cover: Media | null;

  @Column({ name: 'cover_media_id', type: 'bigint', unsigned: true, nullable: true })
  cover_media_id: string | null;
}
