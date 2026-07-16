import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the `faqs` table (company profile "Pertanyaan Umum"). Plain Q&A with
 * an optional grouping label + manual ordering. Mirrors the master-data table
 * conventions: bigint PK + public uuid, soft-delete.
 */
export class CreateFaqsTable1783410000000 implements MigrationInterface {
  name = 'CreateFaqsTable1783410000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('faqs')) return;

    await queryRunner.query(
      `CREATE TABLE \`faqs\` (` +
        `\`id\` bigint UNSIGNED NOT NULL AUTO_INCREMENT, ` +
        `\`uuid\` varchar(36) NOT NULL, ` +
        `\`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), ` +
        `\`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), ` +
        `\`deleted_at\` datetime(6) NULL, ` +
        `\`question\` varchar(255) NOT NULL, ` +
        `\`answer\` text NOT NULL, ` +
        `\`category\` varchar(100) NULL, ` +
        `\`sort_order\` int NOT NULL DEFAULT 0, ` +
        `\`is_published\` tinyint NOT NULL DEFAULT 1, ` +
        `UNIQUE INDEX \`IDX_uuid\` (\`uuid\`), ` +
        `INDEX \`IDX_faqs_category\` (\`category\`), ` +
        `PRIMARY KEY (\`id\`)` +
        `) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('faqs'))) return;
    await queryRunner.query(`DROP INDEX \`IDX_faqs_category\` ON \`faqs\``);
    await queryRunner.query(`DROP INDEX \`IDX_uuid\` ON \`faqs\``);
    await queryRunner.query(`DROP TABLE \`faqs\``);
  }
}
