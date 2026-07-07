import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';
import dataSource from '../data-source';
import { User } from '../../modules/users/entities/user.entity';
import { Category } from '../../modules/categories/entities/category.entity';
import { UserRole } from '../../common/enums';
import { toSlug } from '../../common/utils/slug.util';

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

  await dataSource.destroy();
  console.log('Seed complete.');
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
