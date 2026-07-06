import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { BulkDeleteDto } from '../../common/dto/bulk-delete.dto';
import { NotificationEvent } from '../../common/enums';
import {
  buildPaginated,
  Paginated,
} from '../../common/interfaces/paginated.interface';
import { NotificationsService } from '../notifications/notifications.service';
import {
  ContactQueryDto,
  CreateContactDto,
  UpdateContactStatusDto,
} from './dto/contact.dto';
import { Contact } from './entities/contact.entity';

export interface ContactResponse {
  id: string;
  name: string;
  phone: string;
  email: string;
  vehicle_model: string | null;
  message: string;
  status: string;
  created_at: string;
}

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact)
    private readonly repo: Repository<Contact>,
    private readonly notifications: NotificationsService,
  ) {}

  /** PUBLIC. 1) save → 2) trigger WA (non-blocking) → returns { id, created_at }. */
  async create(dto: CreateContactDto): Promise<{ id: string; created_at: string }> {
    const contact = await this.repo.save(
      this.repo.create({
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        vehicle_model: dto.vehicle_model ?? null,
        message: dto.message,
      }),
    );

    this.notifications.dispatch({
      event: NotificationEvent.CONTACT_CREATED,
      relatedUuid: contact.uuid,
      message: `🆕 Lead baru dari ${contact.name} (${contact.phone})\nKendaraan: ${
        contact.vehicle_model ?? '-'
      }\nPesan: ${contact.message}`,
    });

    return { id: contact.uuid, created_at: contact.created_at.toISOString() };
  }

  async list(query: ContactQueryDto): Promise<Paginated<ContactResponse>> {
    const where: FindOptionsWhere<Contact> = {};
    if (query.status) where.status = query.status;

    const [rows, total] = await this.repo.findAndCount({
      where,
      order: { created_at: 'DESC' },
      skip: query.skip,
      take: query.limit,
    });

    return buildPaginated(
      rows.map((c) => this.toResponse(c)),
      total,
      query.page,
      query.limit,
    );
  }

  async detail(uuid: string): Promise<ContactResponse> {
    return this.toResponse(await this.getOrFail(uuid));
  }

  async updateStatus(
    uuid: string,
    dto: UpdateContactStatusDto,
  ): Promise<ContactResponse> {
    const contact = await this.getOrFail(uuid);
    contact.status = dto.status;
    return this.toResponse(await this.repo.save(contact));
  }

  async remove(uuid: string): Promise<void> {
    const contact = await this.getOrFail(uuid);
    await this.repo.remove(contact);
  }

  async bulkDelete(dto: BulkDeleteDto): Promise<{ deleted: number }> {
    const rows = await this.repo.find({ where: { uuid: In(dto.ids) } });
    if (rows.length) await this.repo.remove(rows);
    return { deleted: rows.length };
  }

  private async getOrFail(uuid: string): Promise<Contact> {
    const contact = await this.repo.findOne({ where: { uuid } });
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  private toResponse(c: Contact): ContactResponse {
    return {
      id: c.uuid,
      name: c.name,
      phone: c.phone,
      email: c.email,
      vehicle_model: c.vehicle_model,
      message: c.message,
      status: c.status,
      created_at: c.created_at.toISOString(),
    };
  }
}
