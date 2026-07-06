import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, In, Repository } from 'typeorm';
import { BulkDeleteDto } from '../../common/dto/bulk-delete.dto';
import { NotificationEvent } from '../../common/enums';
import {
  buildPaginated,
  Paginated,
} from '../../common/interfaces/paginated.interface';
import { NotificationsService } from '../notifications/notifications.service';
import { Product } from '../products/entities/product.entity';
import {
  CreateOrderDto,
  OrderQueryDto,
  UpdateOrderStatusDto,
} from './dto/order.dto';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';

export interface OrderItemResponse {
  product_slug: string;
  product_name: string;
  price_snapshot: string;
  quantity: number;
}

export interface OrderResponse {
  id: string;
  customer_name: string;
  phone: string;
  email: string | null;
  vehicle_model: string | null;
  note: string | null;
  status: string;
  created_at: string;
  items: OrderItemResponse[];
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly repo: Repository<Order>,
    @InjectRepository(Product)
    private readonly products: Repository<Product>,
    private readonly notifications: NotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  /** PUBLIC. Resolves each slug → price/name snapshot, saves order+items atomically. */
  async create(dto: CreateOrderDto): Promise<{ id: string; created_at: string }> {
    if (!dto.items.length) {
      throw new BadRequestException('Order must contain at least one item');
    }

    const slugs = [...new Set(dto.items.map((i) => i.product_slug))];
    const found = await this.products.find({ where: { slug: In(slugs) } });
    const bySlug = new Map(found.map((p) => [p.slug, p]));

    const missing = slugs.filter((s) => !bySlug.has(s));
    if (missing.length) {
      throw new BadRequestException(`Unknown product(s): ${missing.join(', ')}`);
    }

    const order = await this.dataSource.transaction(async (manager) => {
      const entity = manager.create(Order, {
        customer_name: dto.customer_name,
        phone: dto.phone,
        email: dto.email ?? null,
        vehicle_model: dto.vehicle_model ?? null,
        note: dto.note ?? null,
        items: dto.items.map((i) => {
          const product = bySlug.get(i.product_slug) as Product;
          return manager.create(OrderItem, {
            product_id: product.id,
            product_slug: product.slug,
            product_name: product.name,
            price_snapshot: product.price,
            quantity: i.quantity,
          });
        }),
      });
      return manager.save(entity);
    });

    this.notifications.dispatch({
      event: NotificationEvent.ORDER_CREATED,
      relatedUuid: order.uuid,
      message: `🛒 Pre-order baru dari ${order.customer_name} (${order.phone})\nItem: ${dto.items
        .map((i) => `${i.product_slug} x${i.quantity}`)
        .join(', ')}`,
    });

    return { id: order.uuid, created_at: order.created_at.toISOString() };
  }

  async list(query: OrderQueryDto): Promise<Paginated<OrderResponse>> {
    const where: FindOptionsWhere<Order> = {};
    if (query.status) where.status = query.status;

    const [rows, total] = await this.repo.findAndCount({
      where,
      relations: { items: true },
      order: { created_at: 'DESC' },
      skip: query.skip,
      take: query.limit,
    });

    return buildPaginated(
      rows.map((o) => this.toResponse(o)),
      total,
      query.page,
      query.limit,
    );
  }

  async detail(uuid: string): Promise<OrderResponse> {
    return this.toResponse(await this.getOrFail(uuid));
  }

  async updateStatus(
    uuid: string,
    dto: UpdateOrderStatusDto,
  ): Promise<OrderResponse> {
    const order = await this.getOrFail(uuid);
    order.status = dto.status;
    await this.repo.save(order);
    return this.toResponse(order);
  }

  async remove(uuid: string): Promise<void> {
    const order = await this.getOrFail(uuid);
    await this.repo.remove(order);
  }

  async bulkDelete(dto: BulkDeleteDto): Promise<{ deleted: number }> {
    const rows = await this.repo.find({ where: { uuid: In(dto.ids) } });
    if (rows.length) await this.repo.remove(rows);
    return { deleted: rows.length };
  }

  private async getOrFail(uuid: string): Promise<Order> {
    const order = await this.repo.findOne({
      where: { uuid },
      relations: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  private toResponse(o: Order): OrderResponse {
    return {
      id: o.uuid,
      customer_name: o.customer_name,
      phone: o.phone,
      email: o.email,
      vehicle_model: o.vehicle_model,
      note: o.note,
      status: o.status,
      created_at: o.created_at.toISOString(),
      items: (o.items ?? []).map((i) => ({
        product_slug: i.product_slug,
        product_name: i.product_name,
        price_snapshot: i.price_snapshot,
        quantity: i.quantity,
      })),
    };
  }
}
