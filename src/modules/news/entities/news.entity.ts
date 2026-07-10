import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { SoftDeletableEntity } from '../../../common/entities/base.entity';
import { NewsType } from '../../../common/enums';
import { Media } from '../../media/entities/media.entity';

@Entity('news')
export class News extends SoftDeletableEntity {
  @Index('IDX_news_slug', { unique: true })
  @Column({ type: 'varchar', length: 191 })
  slug: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'enum', enum: NewsType })
  type: NewsType;

  /** Long Instagram caption (10–2200 chars). */
  @Column({ type: 'text' })
  caption: string;

  @Column({ name: 'instagram_url', type: 'varchar', length: 500 })
  instagram_url: string;

  /** Manual "Baru" toggle. The 14-day window is computed on the FE. */
  @Column({ name: 'mark_new', type: 'boolean', default: false })
  mark_new: boolean;

  @Column({ name: 'is_published', type: 'boolean', default: false })
  is_published: boolean;

  /** Null while a draft; set when published. */
  @Column({ name: 'published_at', type: 'datetime', precision: 6, nullable: true })
  published_at: Date | null;

  @ManyToOne(() => Media, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'thumbnail_media_id' })
  thumbnail: Media | null;

  @Column({
    name: 'thumbnail_media_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  thumbnail_media_id: string | null;
}
