import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1783364951179 implements MigrationInterface {
    name = 'InitialSchema1783364951179'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`users\` (\`id\` bigint UNSIGNED NOT NULL AUTO_INCREMENT, \`uuid\` varchar(36) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`email\` varchar(191) NOT NULL, \`name\` varchar(191) NOT NULL, \`password_hash\` varchar(255) NOT NULL, \`refresh_token_hash\` varchar(255) NULL, \`role\` enum ('ADMIN', 'SUPERADMIN') NOT NULL DEFAULT 'ADMIN', UNIQUE INDEX \`IDX_uuid\` (\`uuid\`), UNIQUE INDEX \`IDX_users_email\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`categories\` (\`id\` bigint UNSIGNED NOT NULL AUTO_INCREMENT, \`uuid\` varchar(36) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` datetime(6) NULL, \`name\` varchar(191) NOT NULL, \`slug\` varchar(191) NOT NULL, UNIQUE INDEX \`IDX_uuid\` (\`uuid\`), UNIQUE INDEX \`IDX_categories_name\` (\`name\`), UNIQUE INDEX \`IDX_categories_slug\` (\`slug\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`media\` (\`id\` bigint UNSIGNED NOT NULL AUTO_INCREMENT, \`uuid\` varchar(36) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`type\` enum ('IMAGE', 'PDF') NOT NULL, \`url\` varchar(512) NOT NULL, \`filename\` varchar(255) NOT NULL, \`mime_type\` varchar(128) NOT NULL, \`size_bytes\` int UNSIGNED NOT NULL, \`width\` int UNSIGNED NULL, \`height\` int UNSIGNED NULL, \`storage_key\` varchar(512) NOT NULL, \`sort_order\` int NOT NULL DEFAULT '0', \`product_id\` bigint UNSIGNED NULL, UNIQUE INDEX \`IDX_uuid\` (\`uuid\`), INDEX \`IDX_media_product\` (\`product_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`products\` (\`id\` bigint UNSIGNED NOT NULL AUTO_INCREMENT, \`uuid\` varchar(36) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` datetime(6) NULL, \`slug\` varchar(191) NOT NULL, \`name\` varchar(191) NOT NULL, \`price\` decimal(12,2) NOT NULL, \`badge\` enum ('BARU', 'HOT', 'TERLARIS', 'PRE_ORDER') NULL, \`description\` text NOT NULL, \`compatibility\` json NOT NULL, \`specs\` json NOT NULL, \`is_featured\` tinyint NOT NULL DEFAULT 0, \`is_published\` tinyint NOT NULL DEFAULT 1, \`category_id\` bigint UNSIGNED NOT NULL, UNIQUE INDEX \`IDX_uuid\` (\`uuid\`), UNIQUE INDEX \`IDX_products_slug\` (\`slug\`), INDEX \`IDX_products_category\` (\`category_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`order_items\` (\`id\` bigint UNSIGNED NOT NULL AUTO_INCREMENT, \`uuid\` varchar(36) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`order_id\` bigint UNSIGNED NOT NULL, \`product_id\` bigint UNSIGNED NULL, \`product_slug\` varchar(191) NOT NULL, \`product_name\` varchar(191) NOT NULL, \`price_snapshot\` decimal(12,2) NOT NULL, \`quantity\` int UNSIGNED NOT NULL, UNIQUE INDEX \`IDX_uuid\` (\`uuid\`), INDEX \`IDX_order_items_order\` (\`order_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`orders\` (\`id\` bigint UNSIGNED NOT NULL AUTO_INCREMENT, \`uuid\` varchar(36) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`customer_name\` varchar(191) NOT NULL, \`phone\` varchar(32) NOT NULL, \`email\` varchar(191) NULL, \`vehicle_model\` varchar(191) NULL, \`note\` text NULL, \`status\` enum ('NEW', 'PROCESSED', 'DONE', 'CANCELLED') NOT NULL DEFAULT 'NEW', UNIQUE INDEX \`IDX_uuid\` (\`uuid\`), INDEX \`IDX_orders_status\` (\`status\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`notifications\` (\`id\` bigint UNSIGNED NOT NULL AUTO_INCREMENT, \`uuid\` varchar(36) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`channel\` enum ('WHATSAPP') NOT NULL, \`event\` enum ('CONTACT_CREATED', 'ORDER_CREATED') NOT NULL, \`status\` enum ('SENT', 'FAILED', 'SKIPPED') NOT NULL, \`target\` varchar(32) NULL, \`message\` text NOT NULL, \`related_uuid\` varchar(36) NULL, \`error\` text NULL, UNIQUE INDEX \`IDX_uuid\` (\`uuid\`), INDEX \`IDX_notifications_event\` (\`event\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`contacts\` (\`id\` bigint UNSIGNED NOT NULL AUTO_INCREMENT, \`uuid\` varchar(36) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`name\` varchar(191) NOT NULL, \`phone\` varchar(32) NOT NULL, \`email\` varchar(191) NOT NULL, \`vehicle_model\` varchar(191) NULL, \`message\` text NOT NULL, \`status\` enum ('NEW', 'CONTACTED', 'CLOSED') NOT NULL DEFAULT 'NEW', UNIQUE INDEX \`IDX_uuid\` (\`uuid\`), INDEX \`IDX_contacts_status\` (\`status\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`cms_sections\` (\`id\` bigint UNSIGNED NOT NULL AUTO_INCREMENT, \`uuid\` varchar(36) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` datetime(6) NULL, \`section_key\` varchar(120) NOT NULL, \`content_json\` json NOT NULL, UNIQUE INDEX \`IDX_uuid\` (\`uuid\`), UNIQUE INDEX \`IDX_cms_key\` (\`section_key\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`blogs\` (\`id\` bigint UNSIGNED NOT NULL AUTO_INCREMENT, \`uuid\` varchar(36) NOT NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` datetime(6) NULL, \`slug\` varchar(191) NOT NULL, \`title\` varchar(255) NOT NULL, \`category\` enum ('TIPS', 'RILIS', 'PANDUAN', 'BERITA') NOT NULL, \`excerpt\` varchar(500) NOT NULL, \`content_html\` longtext NOT NULL, \`author\` varchar(191) NOT NULL, \`reading_minutes\` smallint UNSIGNED NOT NULL DEFAULT '1', \`is_published\` tinyint NOT NULL DEFAULT 1, \`published_at\` datetime(6) NOT NULL, \`cover_media_id\` bigint UNSIGNED NULL, UNIQUE INDEX \`IDX_uuid\` (\`uuid\`), UNIQUE INDEX \`IDX_blogs_slug\` (\`slug\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`media\` ADD CONSTRAINT \`FK_1fe69e256dfd757e9e7651c6bf5\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`products\` ADD CONSTRAINT \`FK_9a5f6868c96e0069e699f33e124\` FOREIGN KEY (\`category_id\`) REFERENCES \`categories\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`order_items\` ADD CONSTRAINT \`FK_145532db85752b29c57d2b7b1f1\` FOREIGN KEY (\`order_id\`) REFERENCES \`orders\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`order_items\` ADD CONSTRAINT \`FK_9263386c35b6b242540f9493b00\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`blogs\` ADD CONSTRAINT \`FK_88b1c81a308dc5d1d01c35d24ab\` FOREIGN KEY (\`cover_media_id\`) REFERENCES \`media\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`blogs\` DROP FOREIGN KEY \`FK_88b1c81a308dc5d1d01c35d24ab\``);
        await queryRunner.query(`ALTER TABLE \`order_items\` DROP FOREIGN KEY \`FK_9263386c35b6b242540f9493b00\``);
        await queryRunner.query(`ALTER TABLE \`order_items\` DROP FOREIGN KEY \`FK_145532db85752b29c57d2b7b1f1\``);
        await queryRunner.query(`ALTER TABLE \`products\` DROP FOREIGN KEY \`FK_9a5f6868c96e0069e699f33e124\``);
        await queryRunner.query(`ALTER TABLE \`media\` DROP FOREIGN KEY \`FK_1fe69e256dfd757e9e7651c6bf5\``);
        await queryRunner.query(`DROP INDEX \`IDX_blogs_slug\` ON \`blogs\``);
        await queryRunner.query(`DROP INDEX \`IDX_uuid\` ON \`blogs\``);
        await queryRunner.query(`DROP TABLE \`blogs\``);
        await queryRunner.query(`DROP INDEX \`IDX_cms_key\` ON \`cms_sections\``);
        await queryRunner.query(`DROP INDEX \`IDX_uuid\` ON \`cms_sections\``);
        await queryRunner.query(`DROP TABLE \`cms_sections\``);
        await queryRunner.query(`DROP INDEX \`IDX_contacts_status\` ON \`contacts\``);
        await queryRunner.query(`DROP INDEX \`IDX_uuid\` ON \`contacts\``);
        await queryRunner.query(`DROP TABLE \`contacts\``);
        await queryRunner.query(`DROP INDEX \`IDX_notifications_event\` ON \`notifications\``);
        await queryRunner.query(`DROP INDEX \`IDX_uuid\` ON \`notifications\``);
        await queryRunner.query(`DROP TABLE \`notifications\``);
        await queryRunner.query(`DROP INDEX \`IDX_orders_status\` ON \`orders\``);
        await queryRunner.query(`DROP INDEX \`IDX_uuid\` ON \`orders\``);
        await queryRunner.query(`DROP TABLE \`orders\``);
        await queryRunner.query(`DROP INDEX \`IDX_order_items_order\` ON \`order_items\``);
        await queryRunner.query(`DROP INDEX \`IDX_uuid\` ON \`order_items\``);
        await queryRunner.query(`DROP TABLE \`order_items\``);
        await queryRunner.query(`DROP INDEX \`IDX_products_category\` ON \`products\``);
        await queryRunner.query(`DROP INDEX \`IDX_products_slug\` ON \`products\``);
        await queryRunner.query(`DROP INDEX \`IDX_uuid\` ON \`products\``);
        await queryRunner.query(`DROP TABLE \`products\``);
        await queryRunner.query(`DROP INDEX \`IDX_media_product\` ON \`media\``);
        await queryRunner.query(`DROP INDEX \`IDX_uuid\` ON \`media\``);
        await queryRunner.query(`DROP TABLE \`media\``);
        await queryRunner.query(`DROP INDEX \`IDX_categories_slug\` ON \`categories\``);
        await queryRunner.query(`DROP INDEX \`IDX_categories_name\` ON \`categories\``);
        await queryRunner.query(`DROP INDEX \`IDX_uuid\` ON \`categories\``);
        await queryRunner.query(`DROP TABLE \`categories\``);
        await queryRunner.query(`DROP INDEX \`IDX_users_email\` ON \`users\``);
        await queryRunner.query(`DROP INDEX \`IDX_uuid\` ON \`users\``);
        await queryRunner.query(`DROP TABLE \`users\``);
    }

}
