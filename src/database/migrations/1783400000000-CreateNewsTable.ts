import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the `news` table (Instagram content — Reels/Poster) with a nullable
 * thumbnail FK to `media`. Mirrors the blogs table conventions: bigint PK +
 * public uuid, soft-delete, unique slug.
 */
export class CreateNewsTable1783400000000 implements MigrationInterface {
  name = 'CreateNewsTable1783400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('news')) return;

    await queryRunner.query(
      `CREATE TABLE \`news\` (` +
        `\`id\` bigint UNSIGNED NOT NULL AUTO_INCREMENT, ` +
        `\`uuid\` varchar(36) NOT NULL, ` +
        `\`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), ` +
        `\`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), ` +
        `\`deleted_at\` datetime(6) NULL, ` +
        `\`slug\` varchar(191) NOT NULL, ` +
        `\`title\` varchar(255) NOT NULL, ` +
        `\`type\` enum ('REELS', 'POSTER') NOT NULL, ` +
        `\`caption\` text NOT NULL, ` +
        `\`instagram_url\` varchar(500) NOT NULL, ` +
        `\`mark_new\` tinyint NOT NULL DEFAULT 0, ` +
        `\`is_published\` tinyint NOT NULL DEFAULT 0, ` +
        `\`published_at\` datetime(6) NULL, ` +
        `\`thumbnail_media_id\` bigint UNSIGNED NULL, ` +
        `UNIQUE INDEX \`IDX_uuid\` (\`uuid\`), ` +
        `UNIQUE INDEX \`IDX_news_slug\` (\`slug\`), ` +
        `PRIMARY KEY (\`id\`)` +
        `) ENGINE=InnoDB`,
    );

    await queryRunner.query(
      `ALTER TABLE \`news\` ADD CONSTRAINT \`FK_news_thumbnail\` ` +
        `FOREIGN KEY (\`thumbnail_media_id\`) REFERENCES \`media\`(\`id\`) ` +
        `ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('news'))) return;
    await queryRunner.query(
      `ALTER TABLE \`news\` DROP FOREIGN KEY \`FK_news_thumbnail\``,
    );
    await queryRunner.query(`DROP INDEX \`IDX_news_slug\` ON \`news\``);
    await queryRunner.query(`DROP INDEX \`IDX_uuid\` ON \`news\``);
    await queryRunner.query(`DROP TABLE \`news\``);
  }
}
