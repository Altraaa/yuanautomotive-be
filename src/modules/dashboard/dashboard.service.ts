import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  MoreThanOrEqual,
  ObjectLiteral,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { ContactStatus, OrderStatus } from '../../common/enums';
import { Blog } from '../blog/entities/blog.entity';
import { Contact } from '../contacts/entities/contact.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Order } from '../orders/entities/order.entity';
import { Product } from '../products/entities/product.entity';
import {
  Range,
  StatusBreakdownQueryDto,
  TimeseriesQueryDto,
  TopProductsQueryDto,
} from './dto/dashboard-query.dto';

const RANGE_DAYS: Record<Range, number> = { '7d': 7, '30d': 30, '90d': 90 };

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Product)
    private readonly products: Repository<Product>,
    @InjectRepository(Blog)
    private readonly blogs: Repository<Blog>,
    @InjectRepository(Contact)
    private readonly contacts: Repository<Contact>,
    @InjectRepository(Order)
    private readonly orders: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItems: Repository<OrderItem>,
  ) {}

  // ── §6.1 summary ──────────────────────────────────
  async summary() {
    const now = new Date();
    const period = 30;
    const currentFrom = this.daysAgo(now, period);
    const prevFrom = this.daysAgo(now, period * 2);

    const [
      productsTotal,
      productsPublished,
      blogsTotal,
      blogsPublished,
      leadsTotal,
      leadsNew,
      ordersTotal,
      ordersNew,
      revenueEstimate,
      leadsCurrent,
      leadsPrev,
      ordersCurrent,
      ordersPrev,
    ] = await Promise.all([
      this.products.count(),
      this.products.count({ where: { is_published: true } }),
      this.blogs.count(),
      this.blogs.count({ where: { is_published: true } }),
      this.contacts.count(),
      this.contacts.count({ where: { status: ContactStatus.NEW } }),
      this.orders.count(),
      this.orders.count({ where: { status: OrderStatus.NEW } }),
      this.totalRevenue(),
      this.contacts.count({ where: { created_at: MoreThanOrEqual(currentFrom) } }),
      this.contacts.count({
        where: { created_at: Between(prevFrom, currentFrom) },
      }),
      this.orders.count({ where: { created_at: MoreThanOrEqual(currentFrom) } }),
      this.orders.count({
        where: { created_at: Between(prevFrom, currentFrom) },
      }),
    ]);

    return {
      products: { total: productsTotal, published: productsPublished },
      blogs: { total: blogsTotal, published: blogsPublished },
      leads: { total: leadsTotal, new: leadsNew },
      orders: {
        total: ordersTotal,
        new: ordersNew,
        revenue_estimate: revenueEstimate,
      },
      deltas: {
        leads_pct_vs_prev_period: this.pctDelta(leadsCurrent, leadsPrev),
        orders_pct_vs_prev_period: this.pctDelta(ordersCurrent, ordersPrev),
      },
    };
  }

  // ── §6.2 timeseries ───────────────────────────────
  async timeseries(query: TimeseriesQueryDto) {
    const days = RANGE_DAYS[query.range];
    const from = this.daysAgo(new Date(), days);
    const bucket =
      query.granularity === 'week'
        ? "DATE_FORMAT(t.created_at, '%x-W%v')"
        : 'DATE(t.created_at)';

    const applyTail = (qb: SelectQueryBuilder<ObjectLiteral>) =>
      qb
        .where('t.created_at >= :from', { from })
        .groupBy('date')
        .orderBy('date', 'ASC')
        .getRawMany<{ date: string | Date; value: string }>();

    let raw: { date: string | Date; value: string }[];
    if (query.metric === 'revenue') {
      raw = await applyTail(
        this.orders
          .createQueryBuilder('t')
          .innerJoin('t.items', 'i')
          .select(bucket, 'date')
          .addSelect('SUM(i.price_snapshot * i.quantity)', 'value'),
      );
    } else {
      const repo = query.metric === 'orders' ? this.orders : this.contacts;
      raw = await applyTail(
        repo
          .createQueryBuilder('t')
          .select(bucket, 'date')
          .addSelect('COUNT(*)', 'value'),
      );
    }

    return {
      metric: query.metric,
      range: query.range,
      points: raw.map((r) => ({
        date: this.formatDate(r.date),
        value: Number(r.value),
      })),
    };
  }

  // ── §6.3 products by category ─────────────────────
  async productsByCategory() {
    const raw = await this.products
      .createQueryBuilder('p')
      .innerJoin('p.category', 'c')
      .select('c.name', 'category')
      .addSelect('COUNT(p.id)', 'count')
      .groupBy('c.name')
      .orderBy('count', 'DESC')
      .getRawMany<{ category: string; count: string }>();

    return { items: raw.map((r) => ({ category: r.category, count: Number(r.count) })) };
  }

  // ── §6.4 top products ─────────────────────────────
  async topProducts(query: TopProductsQueryDto) {
    const from = this.daysAgo(new Date(), RANGE_DAYS[query.range]);
    const raw = await this.orderItems
      .createQueryBuilder('i')
      .innerJoin('i.order', 'o')
      .select('i.product_slug', 'slug')
      .addSelect('i.product_name', 'name')
      .addSelect('COUNT(DISTINCT o.id)', 'order_count')
      .addSelect('SUM(i.quantity)', 'qty_total')
      .where('o.created_at >= :from', { from })
      .groupBy('i.product_slug')
      .addGroupBy('i.product_name')
      .orderBy('qty_total', 'DESC')
      .limit(query.limit)
      .getRawMany<{
        slug: string;
        name: string;
        order_count: string;
        qty_total: string;
      }>();

    return {
      items: raw.map((r) => ({
        slug: r.slug,
        name: r.name,
        order_count: Number(r.order_count),
        qty_total: Number(r.qty_total),
      })),
    };
  }

  // ── §6.5 status breakdown ─────────────────────────
  async statusBreakdown(query: StatusBreakdownQueryDto) {
    const repo = query.entity === 'orders' ? this.orders : this.contacts;
    const raw = await repo
      .createQueryBuilder('t')
      .select('t.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('t.status')
      .getRawMany<{ status: string; count: string }>();

    return {
      entity: query.entity,
      items: raw.map((r) => ({ status: r.status, count: Number(r.count) })),
    };
  }

  // ── §6.6 recent activity ──────────────────────────
  async recent() {
    const [leads, orders] = await Promise.all([
      this.contacts.find({ order: { created_at: 'DESC' }, take: 5 }),
      this.orders.find({
        order: { created_at: 'DESC' },
        take: 5,
        relations: { items: true },
      }),
    ]);

    return {
      leads: leads.map((l) => ({
        id: l.uuid,
        name: l.name,
        created_at: l.created_at.toISOString(),
        status: l.status,
      })),
      orders: orders.map((o) => ({
        id: o.uuid,
        customer_name: o.customer_name,
        items_count: o.items?.length ?? 0,
        created_at: o.created_at.toISOString(),
        status: o.status,
      })),
    };
  }

  // ── helpers ───────────────────────────────────────
  private async totalRevenue(): Promise<string> {
    const raw = await this.orderItems
      .createQueryBuilder('i')
      .select('COALESCE(SUM(i.price_snapshot * i.quantity), 0)', 'sum')
      .getRawOne<{ sum: string }>();
    return raw?.sum ?? '0';
  }

  private daysAgo(from: Date, days: number): Date {
    return new Date(from.getTime() - days * 24 * 60 * 60 * 1000);
  }

  private pctDelta(current: number, prev: number): number {
    if (prev === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - prev) / prev) * 1000) / 10;
  }

  private formatDate(value: string | Date): string {
    // DATE() comes back as a Date or 'YYYY-MM-DD'; week bucket is already a label.
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return value.length >= 10 ? value.slice(0, 10) : value;
  }
}
