import { Column, Entity, Index } from 'typeorm';
import { SoftDeletableEntity } from '../../../common/entities/base.entity';

/**
 * FAQ item (company profile "Pertanyaan Umum"). Plain Q&A with optional
 * grouping label + manual ordering. Follows the same conventions as the other
 * master-data tables: bigint PK + public uuid, soft-delete.
 */
@Entity('faqs')
export class Faq extends SoftDeletableEntity {
  @Column({ type: 'varchar', length: 255 })
  question: string;

  @Column({ type: 'text' })
  answer: string;

  /** Optional grouping label (e.g. "Pembelian", "Garansi"). Null = ungrouped. */
  @Index('IDX_faqs_category')
  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string | null;

  /** Manual sort weight — ascending. Lower shows first. */
  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sort_order: number;

  @Column({ name: 'is_published', type: 'boolean', default: true })
  is_published: boolean;
}
