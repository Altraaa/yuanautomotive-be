import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { RevalidateService } from '../../common/services/revalidate.service';
import { uniqueSlug } from '../../common/utils/slug.util';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { Category } from './entities/category.entity';

export interface CategoryResponse {
  id: string;
  name: string;
  slug: string;
}

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly repo: Repository<Category>,
    private readonly revalidate: RevalidateService,
  ) {}

  async findAll(): Promise<CategoryResponse[]> {
    const rows = await this.repo.find({ order: { name: 'ASC' } });
    return rows.map((c) => this.toResponse(c));
  }

  async findOne(uuid: string): Promise<CategoryResponse> {
    return this.toResponse(await this.getOrFail(uuid));
  }

  /** Internal helper for the products module (resolve category by public uuid). */
  async getEntityByUuid(uuid: string): Promise<Category> {
    return this.getOrFail(uuid);
  }

  async create(dto: CreateCategoryDto): Promise<CategoryResponse> {
    const slug = await uniqueSlug(dto.name, (c) => this.slugTaken(c));
    const entity = this.repo.create({ name: dto.name, slug });
    const saved = await this.repo.save(entity);
    this.revalidate.trigger('products');
    return this.toResponse(saved);
  }

  async update(uuid: string, dto: UpdateCategoryDto): Promise<CategoryResponse> {
    const category = await this.getOrFail(uuid);
    if (dto.name && dto.name !== category.name) {
      category.name = dto.name;
      category.slug = await uniqueSlug(dto.name, (c) =>
        this.slugTaken(c, category.id),
      );
    }
    const saved = await this.repo.save(category);
    this.revalidate.trigger('products');
    return this.toResponse(saved);
  }

  async remove(uuid: string): Promise<void> {
    const category = await this.getOrFail(uuid);
    await this.repo.softRemove(category);
    this.revalidate.trigger('products');
  }

  // ── helpers ───────────────────────────────────────
  private async getOrFail(uuid: string): Promise<Category> {
    const category = await this.repo.findOne({ where: { uuid } });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  private async slugTaken(slug: string, exceptId?: string): Promise<boolean> {
    const where = exceptId
      ? { slug, id: Not(exceptId) }
      : { slug };
    return (await this.repo.count({ where })) > 0;
  }

  private toResponse(c: Category): CategoryResponse {
    return { id: c.uuid, name: c.name, slug: c.slug };
  }
}
