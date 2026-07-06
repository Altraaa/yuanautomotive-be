import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RevalidateService } from '../../common/services/revalidate.service';
import { UpdateCmsDto } from './dto/cms.dto';
import { CmsSection } from './entities/cms-section.entity';

export interface CmsResponse {
  key: string;
  data: Record<string, unknown>;
}

@Injectable()
export class CmsService {
  constructor(
    @InjectRepository(CmsSection)
    private readonly repo: Repository<CmsSection>,
    private readonly revalidate: RevalidateService,
  ) {}

  async get(key: string): Promise<CmsResponse> {
    const section = await this.repo.findOne({ where: { key } });
    if (!section) throw new NotFoundException(`CMS section not found: ${key}`);
    return { key: section.key, data: section.data };
  }

  /** Upsert: creates the section if it doesn't exist, then revalidates cms-<key>. */
  async upsert(key: string, dto: UpdateCmsDto): Promise<CmsResponse> {
    let section = await this.repo.findOne({ where: { key } });
    if (section) {
      section.data = dto.data;
    } else {
      section = this.repo.create({ key, data: dto.data });
    }
    const saved = await this.repo.save(section);
    this.revalidate.trigger(`cms-${key}`);
    return { key: saved.key, data: saved.data };
  }
}
