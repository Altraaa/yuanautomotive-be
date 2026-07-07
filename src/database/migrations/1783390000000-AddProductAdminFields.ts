import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds the admin-panel product columns (sku, price_wholesale, stock, view_count,
 * author_id) that were introduced in the entity after InitialSchema had already
 * been applied to existing databases. The columns live in InitialSchema's
 * CREATE TABLE too (for fresh installs); this migration reconciles DBs that were
 * created before those columns existed.
 */
export class AddProductAdminFields1783390000000 implements MigrationInterface {
    name = 'AddProductAdminFields1783390000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('products');
        const has = (col: string) => !!table?.findColumnByName(col);

        if (!has('sku')) {
            await queryRunner.query(`ALTER TABLE \`products\` ADD \`sku\` varchar(64) NOT NULL AFTER \`slug\``);
            await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_products_sku\` ON \`products\` (\`sku\`)`);
        }
        if (!has('price_wholesale')) {
            await queryRunner.query(`ALTER TABLE \`products\` ADD \`price_wholesale\` decimal(12,2) NULL AFTER \`price\``);
        }
        if (!has('stock')) {
            await queryRunner.query(`ALTER TABLE \`products\` ADD \`stock\` int UNSIGNED NOT NULL DEFAULT '0' AFTER \`price_wholesale\``);
        }
        if (!has('view_count')) {
            await queryRunner.query(`ALTER TABLE \`products\` ADD \`view_count\` int UNSIGNED NOT NULL DEFAULT '0' AFTER \`stock\``);
        }
        if (!has('author_id')) {
            await queryRunner.query(`ALTER TABLE \`products\` ADD \`author_id\` bigint UNSIGNED NULL AFTER \`category_id\``);
            await queryRunner.query(`CREATE INDEX \`IDX_products_author\` ON \`products\` (\`author_id\`)`);
            await queryRunner.query(`ALTER TABLE \`products\` ADD CONSTRAINT \`FK_products_author\` FOREIGN KEY (\`author_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('products');
        const has = (col: string) => !!table?.findColumnByName(col);

        if (has('author_id')) {
            await queryRunner.query(`ALTER TABLE \`products\` DROP FOREIGN KEY \`FK_products_author\``);
            await queryRunner.query(`DROP INDEX \`IDX_products_author\` ON \`products\``);
            await queryRunner.query(`ALTER TABLE \`products\` DROP COLUMN \`author_id\``);
        }
        if (has('view_count')) {
            await queryRunner.query(`ALTER TABLE \`products\` DROP COLUMN \`view_count\``);
        }
        if (has('stock')) {
            await queryRunner.query(`ALTER TABLE \`products\` DROP COLUMN \`stock\``);
        }
        if (has('price_wholesale')) {
            await queryRunner.query(`ALTER TABLE \`products\` DROP COLUMN \`price_wholesale\``);
        }
        if (has('sku')) {
            await queryRunner.query(`DROP INDEX \`IDX_products_sku\` ON \`products\``);
            await queryRunner.query(`ALTER TABLE \`products\` DROP COLUMN \`sku\``);
        }
    }
}
