import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';
import dataSource from '../data-source';
import { User } from '../../modules/users/entities/user.entity';
import { Category } from '../../modules/categories/entities/category.entity';
import { Product } from '../../modules/products/entities/product.entity';
import { Faq } from '../../modules/faqs/entities/faq.entity';
import { ProductBadge, UserRole } from '../../common/enums';
import { toSlug, uniqueSlug } from '../../common/utils/slug.util';
import faqSeed from './faqs.json';
import productSeed from './products.json';

/** FAQ seed row (mirrors the CreateFaqDto shape). */
interface SeedFaq {
  question: string;
  answer: string;
  category: string | null;
  sort_order: number;
  is_published: boolean;
}

const SEED_FAQS: SeedFaq[] = faqSeed as SeedFaq[];

/** Seed catalogue row — no images (admin uploads them later). `compatibility`
 *  is stored as brand-only strings; loaded into the new { brand, model } shape
 *  (model unknown = "") which the FE renders as brand-only (see SPEC §5). */
interface SeedProduct {
  name: string;
  sku: string;
  category: string;
  price: string;
  badge?: ProductBadge | null;
  description: string;
  compatibility: string[];
  specs: { label: string; value: string }[];
}

const SEED_PRODUCTS: SeedProduct[] = productSeed as SeedProduct[];

/** Legacy brand string → structured fitment ({ brand, model: "" }). */
const toFitments = (list: string[]) =>
  list.map((brand) => ({ brand, model: '' }));

dotenv.config();

/** Idempotent seed: 1 super-admin + the 3 base categories. Safe to re-run. */
async function run() {
  await dataSource.initialize();
  const userRepo = dataSource.getRepository(User);
  const categoryRepo = dataSource.getRepository(Category);

  // ── Admin (upsert: always re-sync password/name/role from env) ──
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@yuandewatatimur.com';
  const name = process.env.SEED_ADMIN_NAME ?? 'Super Admin';
  const passwordHash = await bcrypt.hash(
    process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!',
    10,
  );
  const existing = await userRepo.findOne({ where: { email } });
  if (!existing) {
    await userRepo.save(
      userRepo.create({
        email,
        name,
        password_hash: passwordHash,
        role: UserRole.SUPER_ADMIN,
      }),
    );
    console.log(`✓ Seeded admin: ${email}`);
  } else {
    // Re-sync credentials so changing SEED_ADMIN_PASSWORD in .env takes effect.
    existing.name = name;
    existing.password_hash = passwordHash;
    existing.role = UserRole.SUPER_ADMIN;
    existing.refresh_token_hash = null; // invalidate old sessions
    await userRepo.save(existing);
    console.log(`✓ Re-synced admin credentials: ${email}`);
  }

  // ── Categories ──
  const names = ['Sparepart', 'Body Part', 'Aksesoris'];
  for (const name of names) {
    const found = await categoryRepo.findOne({ where: { name } });
    if (!found) {
      await categoryRepo.save(categoryRepo.create({ name, slug: toSlug(name) }));
      console.log(`✓ Seeded category: ${name}`);
    }
  }

  // ── Products (idempotent by SKU, no images) ──
  const admin = await userRepo.findOne({ where: { email } });
  const productRepo = dataSource.getRepository(Product);
  const categoryByName = new Map<string, Category>();
  for (const c of await categoryRepo.find()) categoryByName.set(c.name, c);

  // Optional hard reset: wipe every existing product before re-seeding.
  // Gated behind an env flag so a normal `npm run seed` never destroys data.
  // Media rows survive (FK is ON DELETE SET NULL) — their product_id is nulled,
  // so uploaded files are orphaned, not deleted.
  if (process.env.SEED_RESET_PRODUCTS === 'true') {
    const { affected } = await productRepo
      .createQueryBuilder()
      .delete()
      .from(Product)
      .execute();
    console.log(`⚠ SEED_RESET_PRODUCTS: hard-deleted ${affected ?? 0} product(s)`);
  }

  for (const p of SEED_PRODUCTS) {
    // `withDeleted` so a soft-deleted SKU counts as "already exists" — the seed
    // never resurrects or overwrites a row an admin has archived.
    if (await productRepo.findOne({ where: { sku: p.sku }, withDeleted: true })) {
      console.log(`• Product already exists: ${p.sku}`);
      continue;
    }
    const category = categoryByName.get(p.category);
    if (!category) {
      console.warn(`! Skipped ${p.sku}: category "${p.category}" not found`);
      continue;
    }
    const slug = await uniqueSlug(
      p.name,
      // `withDeleted` so slugs held by soft-deleted rows are still treated as
      // taken — the MySQL unique index counts them, so skipping them here would
      // otherwise produce a duplicate-key crash.
      async (c) =>
        (await productRepo.count({ where: { slug: c }, withDeleted: true })) > 0,
    );
    await productRepo.save(
      productRepo.create({
        name: p.name,
        sku: p.sku,
        slug,
        price: p.price,
        badge: p.badge ?? null,
        description: p.description,
        compatibility: toFitments(p.compatibility),
        specs: p.specs.map((s, i) => ({ ...s, sort_order: i })),
        category_id: category.id,
        author_id: admin?.id ?? null,
      }),
    );
    console.log(`✓ Seeded product: ${p.name}`);
  }

  // ── FAQs (idempotent by question, sourced from faqs.json) ──
  const faqRepo = dataSource.getRepository(Faq);
  for (const f of SEED_FAQS) {
    if (await faqRepo.findOne({ where: { question: f.question } })) {
      console.log(`• FAQ already exists: ${f.question}`);
      continue;
    }
    await faqRepo.save(
      faqRepo.create({
        question: f.question,
        answer: f.answer,
        category: f.category ?? null,
        sort_order: f.sort_order ?? 0,
        is_published: f.is_published ?? true,
      }),
    );
    console.log(`✓ Seeded FAQ: ${f.question}`);
  }

  await dataSource.destroy();
  console.log('Seed complete.');
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
