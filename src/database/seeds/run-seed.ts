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

/** FAQ seed row (mirrors the CreateFaqDto shape). */
interface SeedFaq {
  question: string;
  answer: string;
  category: string | null;
  sort_order: number;
  is_published: boolean;
}

const SEED_FAQS: SeedFaq[] = faqSeed as SeedFaq[];

/** Seed catalogue — no images (admin uploads them later). */
interface SeedProduct {
  name: string;
  sku: string;
  category: string;
  price: string;
  badge?: ProductBadge;
  description: string;
  compatibility: string[];
  specs: { label: string; value: string }[];
}

const SEED_PRODUCTS: SeedProduct[] = [
  {
    name: 'Brake Pads',
    sku: 'YD-BRK-PAD-F',
    category: 'Sparepart',
    price: '185000',
    badge: ProductBadge.TERLARIS,
    description:
      'Kampas rem depan dengan material semi-metallic, pakem dan minim bunyi untuk pengereman harian yang stabil.',
    compatibility: ['Toyota', 'Daihatsu', 'Honda'],
    specs: [
      { label: 'Posisi', value: 'Depan' },
      { label: 'Material', value: 'Semi-metallic' },
      { label: 'Garansi', value: '1 Bulan' },
    ],
  },
  {
    name: 'Cabin Air Filter',
    sku: 'YD-FLT-CAB',
    category: 'Sparepart',
    price: '65000',
    badge: ProductBadge.BARU,
    description:
      'Filter kabin AC yang menyaring debu dan polutan agar udara di dalam kabin tetap bersih dan segar.',
    compatibility: ['Toyota', 'Honda', 'Mitsubishi'],
    specs: [
      { label: 'Tipe', value: 'Activated Carbon' },
      { label: 'Garansi', value: '2 Minggu' },
    ],
  },
  {
    name: 'Clutch Disc',
    sku: 'YD-CLT-DISC',
    category: 'Sparepart',
    price: '320000',
    description:
      'Plat kopling dengan kampas tahan panas untuk transfer tenaga yang halus dan usia pakai panjang.',
    compatibility: ['Suzuki', 'Daihatsu', 'Toyota'],
    specs: [
      { label: 'Diameter', value: '200 mm' },
      { label: 'Jumlah Gigi', value: '21T' },
      { label: 'Garansi', value: '1 Bulan' },
    ],
  },
  {
    name: 'Clutch Pressure Plate',
    sku: 'YD-CLT-PLATE',
    category: 'Sparepart',
    price: '410000',
    description:
      'Matahari kopling (dekrup) dengan pegas diafragma presisi untuk cengkeraman kuat dan pedal ringan.',
    compatibility: ['Suzuki', 'Daihatsu', 'Toyota'],
    specs: [
      { label: 'Diameter', value: '200 mm' },
      { label: 'Tipe Pegas', value: 'Diafragma' },
      { label: 'Garansi', value: '1 Bulan' },
    ],
  },
  {
    name: 'Element Air Filter',
    sku: 'YD-FLT-AIR',
    category: 'Sparepart',
    price: '55000',
    description:
      'Elemen saringan udara mesin yang menjaga aliran udara optimal dan melindungi ruang bakar dari kotoran.',
    compatibility: ['Toyota', 'Daihatsu', 'Honda', 'Suzuki'],
    specs: [
      { label: 'Tipe', value: 'Dry Paper Element' },
      { label: 'Garansi', value: '2 Minggu' },
    ],
  },
  {
    name: 'Fan Belt',
    sku: 'YD-BLT-FAN',
    category: 'Sparepart',
    price: '95000',
    badge: ProductBadge.HOT,
    description:
      'V-belt karet penggerak alternator dan pompa air, tahan retak dan meredam bunyi decit saat mesin dingin.',
    compatibility: ['Toyota', 'Honda', 'Mitsubishi', 'Suzuki'],
    specs: [
      { label: 'Profil', value: 'V-Ribbed' },
      { label: 'Garansi', value: '1 Bulan' },
    ],
  },
  {
    name: 'Front Brake Disc',
    sku: 'YD-BRK-DISC-F',
    category: 'Sparepart',
    price: '540000',
    description:
      'Piringan cakram rem depan dengan permukaan presisi, pelepasan panas baik dan minim getaran saat mengerem.',
    compatibility: ['Toyota', 'Daihatsu', 'Honda'],
    specs: [
      { label: 'Posisi', value: 'Depan' },
      { label: 'Diameter', value: '255 mm' },
      { label: 'Garansi', value: '1 Bulan' },
    ],
  },
  {
    name: 'Front Hub Bearing',
    sku: 'YD-BRG-HUB-F',
    category: 'Sparepart',
    price: '275000',
    description:
      'Bearing roda depan dengan pelumasan tahan lama untuk putaran roda halus dan bebas bunyi dengung.',
    compatibility: ['Toyota', 'Daihatsu', 'Suzuki'],
    specs: [
      { label: 'Posisi', value: 'Depan' },
      { label: 'Tipe', value: 'Double Row' },
      { label: 'Garansi', value: '1 Bulan' },
    ],
  },
  {
    name: 'Light Bulb',
    sku: 'YD-ACC-BULB',
    category: 'Aksesoris',
    price: '35000',
    description:
      'Bohlam lampu halogen terang dengan pancaran merata, cocok untuk lampu utama maupun lampu senja.',
    compatibility: ['Universal'],
    specs: [
      { label: 'Tipe Soket', value: 'H4' },
      { label: 'Daya', value: '55W / 60W' },
      { label: 'Tegangan', value: '12V' },
    ],
  },
  {
    name: 'Oil Filter LZWL',
    sku: 'YD-FLT-OIL-LZWL',
    category: 'Sparepart',
    price: '48000',
    badge: ProductBadge.TERLARIS,
    description:
      'Filter oli mesin dengan media saring rapat dan katup by-pass, menjaga sirkulasi oli tetap bersih.',
    compatibility: ['Toyota', 'Daihatsu', 'Suzuki'],
    specs: [
      { label: 'Tipe', value: 'Spin-on' },
      { label: 'Garansi', value: '2 Minggu' },
    ],
  },
  {
    name: 'Petrol Filter',
    sku: 'YD-FLT-PTRL',
    category: 'Sparepart',
    price: '72000',
    description:
      'Saringan bahan bakar yang menahan kotoran dan air agar suplai bensin ke mesin tetap bersih dan lancar.',
    compatibility: ['Toyota', 'Honda', 'Mitsubishi'],
    specs: [
      { label: 'Tipe', value: 'In-line' },
      { label: 'Garansi', value: '2 Minggu' },
    ],
  },
  {
    name: 'Rear Brake Pad',
    sku: 'YD-BRK-PAD-R',
    category: 'Sparepart',
    price: '175000',
    description:
      'Kampas rem belakang dengan daya cengkeram stabil dan produksi debu rendah untuk pengereman yang aman.',
    compatibility: ['Toyota', 'Daihatsu', 'Honda'],
    specs: [
      { label: 'Posisi', value: 'Belakang' },
      { label: 'Material', value: 'Semi-metallic' },
      { label: 'Garansi', value: '1 Bulan' },
    ],
  },
  {
    name: 'Rear Shock Absorber',
    sku: 'YD-SHK-R',
    category: 'Sparepart',
    price: '385000',
    description:
      'Peredam kejut belakang dengan redaman oli yang stabil untuk kenyamanan berkendara di segala kondisi jalan.',
    compatibility: ['Toyota', 'Daihatsu', 'Suzuki'],
    specs: [
      { label: 'Posisi', value: 'Belakang' },
      { label: 'Tipe', value: 'Oil (Twin-tube)' },
      { label: 'Garansi', value: '3 Bulan' },
    ],
  },
  {
    name: 'Release Bearing',
    sku: 'YD-BRG-REL',
    category: 'Sparepart',
    price: '155000',
    description:
      'Bearing pembebas kopling (drek lahar) yang halus saat pedal ditekan, mengurangi bunyi dan getaran.',
    compatibility: ['Suzuki', 'Daihatsu', 'Toyota'],
    specs: [
      { label: 'Tipe', value: 'Self-aligning' },
      { label: 'Garansi', value: '1 Bulan' },
    ],
  },
  {
    name: 'Shock Absorber',
    sku: 'YD-SHK-F',
    category: 'Sparepart',
    price: '365000',
    description:
      'Peredam kejut depan dengan respons redaman presisi untuk handling stabil dan kenyamanan berkendara.',
    compatibility: ['Toyota', 'Daihatsu', 'Suzuki'],
    specs: [
      { label: 'Posisi', value: 'Depan' },
      { label: 'Tipe', value: 'Oil (Twin-tube)' },
      { label: 'Garansi', value: '3 Bulan' },
    ],
  },
  {
    name: 'Spark Plug',
    sku: 'YD-IGN-PLUG',
    category: 'Sparepart',
    price: '42000',
    badge: ProductBadge.HOT,
    description:
      'Busi pengapian dengan elektroda tahan panas untuk percikan api stabil, mesin mudah start dan irit bahan bakar.',
    compatibility: ['Toyota', 'Honda', 'Suzuki', 'Mitsubishi'],
    specs: [
      { label: 'Tipe Elektroda', value: 'Nickel' },
      { label: 'Gap', value: '0.8 mm' },
      { label: 'Garansi', value: '2 Minggu' },
    ],
  },
  {
    name: 'Tie Rod Original',
    sku: 'YD-STR-TIEROD',
    category: 'Sparepart',
    price: '215000',
    badge: ProductBadge.BARU,
    description:
      'Tie rod kemudi original dengan ball joint presisi untuk kendali setir akurat dan keausan ban lebih merata.',
    compatibility: ['Toyota', 'Daihatsu', 'Suzuki'],
    specs: [
      { label: 'Tipe', value: 'Original Equipment' },
      { label: 'Garansi', value: '1 Bulan' },
    ],
  },
];

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

  for (const p of SEED_PRODUCTS) {
    if (await productRepo.findOne({ where: { sku: p.sku } })) {
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
      async (c) => (await productRepo.countBy({ slug: c })) > 0,
    );
    await productRepo.save(
      productRepo.create({
        name: p.name,
        sku: p.sku,
        slug,
        price: p.price,
        badge: p.badge ?? null,
        description: p.description,
        compatibility: p.compatibility,
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
