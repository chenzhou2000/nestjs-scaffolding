import { MigrationInterface, QueryRunner } from 'typeorm'

export class InitialMigration1703000000000 implements MigrationInterface {
  name = 'InitialMigration1703000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`users\` (
        \`id\` varchar(36) NOT NULL,
        \`email\` varchar(255) NOT NULL,
        \`password\` varchar(255) NOT NULL,
        \`firstName\` varchar(255) NOT NULL,
        \`lastName\` varchar(255) NOT NULL,
        \`role\` enum ('user', 'admin', 'moderator') NOT NULL DEFAULT 'user',
        \`isActive\` tinyint NOT NULL DEFAULT 1,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_97672ac88f789774dd47f7c8be\` (\`email\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `)

    await queryRunner.query(`
      CREATE TABLE \`files\` (
        \`id\` varchar(36) NOT NULL,
        \`originalName\` varchar(255) NOT NULL,
        \`filename\` varchar(255) NOT NULL,
        \`mimetype\` varchar(255) NOT NULL,
        \`size\` int NOT NULL,
        \`path\` varchar(255) NOT NULL,
        \`userId\` varchar(36) NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `)

    await queryRunner.query(`
      ALTER TABLE \`files\` 
      ADD CONSTRAINT \`FK_7e7425b17f9e707331e9a6c7335\` 
      FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`files\` DROP FOREIGN KEY \`FK_7e7425b17f9e707331e9a6c7335\``)
    await queryRunner.query(`DROP TABLE \`files\``)
    await queryRunner.query(`DROP INDEX \`IDX_97672ac88f789774dd47f7c8be\` ON \`users\``)
    await queryRunner.query(`DROP TABLE \`users\``)
  }
}