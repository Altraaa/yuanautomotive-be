import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BulkDeleteDto } from '../../common/dto/bulk-delete.dto';
import {
  buildPaginated,
  Paginated,
} from '../../common/interfaces/paginated.interface';
import { RevalidateService } from '../../common/services/revalidate.service';
import { CreateFaqDto, UpdateFaqDto } from './dto/faq.dto';
import { FaqQueryDto } from './dto/faq-query.dto';
import { Faq } from './entities/faq.entity';

/** Public FAQ item. */
export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string | null;
}

/** Admin list row — superset of the public item. */
export interface AdminFaqRow extends FaqItem {
  sort_order: number;
  is_published: boolean;
  created_at: string;
}

@Injectable()
export class FaqsService {
  constructor(
    @InjectRepository(Faq)
    private readonly repo: Repository<Faq>,
    private readonly revalidate: RevalidateService,
  ) {}

  // ── PUBLIC ────────────────────────────────────────
  async listPublic(query: FaqQueryDto): Promise<Paginated<FaqItem>> {
    const qb = this.baseQuery(query)
      .andWhere('f.is_published = :pub', { pub: true })
      .orderBy('f.sort_order', 'ASC')
      .addOrderBy('f.created_at', 'ASC');

    const [rows, total] = await qb
      .skip(query.skip)
      .take(query.limit)
      .getManyAndCount();

    return buildPaginated(
      rows.map((f) => this.toItem(f)),
      total,
      query.page,
      query.limit,
    );
  }

  // ── ADMIN ─────────────────────────────────────────
  async adminList(query: FaqQueryDto): Promise<Paginated<AdminFaqRow>> {
    const qb = this.baseQuery(query)
      .orderBy('f.sort_order', 'ASC')
      .addOrderBy('f.created_at', 'DESC');

    const [rows, total] = await qb
      .skip(query.skip)
      .take(query.limit)
      .getManyAndCount();

    return buildPaginated(
      rows.map((f) => this.toRow(f)),
      total,
      query.page,
      query.limit,
    );
  }

  async adminDetail(uuid: string): Promise<AdminFaqRow> {
    return this.toRow(await this.getOrFail(uuid));
  }

  async create(dto: CreateFaqDto): Promise<AdminFaqRow> {
    const faq = this.repo.create({
      question: dto.question,
      answer: dto.answer,
      category: dto.category ?? null,
      sort_order: dto.sort_order ?? 0,
      is_published: dto.is_published ?? true,
    });
    const saved = await this.repo.save(faq);
    this.revalidate.trigger('faqs');
    return this.toRow(saved);
  }

  async update(uuid: string, dto: UpdateFaqDto): Promise<AdminFaqRow> {
    const faq = await this.getOrFail(uuid);

    if (dto.question !== undefined) faq.question = dto.question;
    if (dto.answer !== undefined) faq.answer = dto.answer;
    if (dto.category !== undefined) faq.category = dto.category ?? null;
    if (dto.sort_order !== undefined) faq.sort_order = dto.sort_order;
    if (dto.is_published !== undefined) faq.is_published = dto.is_published;

    await this.repo.save(faq);
    this.revalidate.trigger('faqs');
    return this.toRow(faq);
  }

  async remove(uuid: string): Promise<void> {
    const faq = await this.getOrFail(uuid);
    await this.repo.softRemove(faq);
    this.revalidate.trigger('faqs');
  }

  async bulkDelete(dto: BulkDeleteDto): Promise<{ deleted: number }> {
    const rows = await this.repo.find({ where: { uuid: In(dto.ids) } });
    if (rows.length) await this.repo.softRemove(rows);
    this.revalidate.trigger('faqs');
    return { deleted: rows.length };
  }

  // ── helpers ───────────────────────────────────────
  private baseQuery(query: FaqQueryDto) {
    const qb = this.repo.createQueryBuilder('f');
    if (query.category) {
      qb.andWhere('f.category = :category', { category: query.category });
    }
    if (query.search) {
      qb.andWhere('(f.question LIKE :s OR f.answer LIKE :s)', {
        s: `%${query.search}%`,
      });
    }
    return qb;
  }

  private async getOrFail(uuid: string): Promise<Faq> {
    const faq = await this.repo.findOne({ where: { uuid } });
    if (!faq) throw new NotFoundException('FAQ not found');
    return faq;
  }

  private toItem(faq: Faq): FaqItem {
    return {
      id: faq.uuid,
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
    };
  }

  private toRow(faq: Faq): AdminFaqRow {
    return {
      ...this.toItem(faq),
      sort_order: faq.sort_order,
      is_published: faq.is_published,
      created_at: faq.created_at.toISOString(),
    };
  }
}
