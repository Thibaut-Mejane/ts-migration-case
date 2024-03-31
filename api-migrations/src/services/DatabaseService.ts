import { Logger } from 'pino';
import { MyMigrations, } from '../utils/types';
import { Knex } from 'knex';


const HF_MIGRATION_TABLE_NAME = 'my_migrations';


export async function getCompletedMigration(logger:Logger, database: Knex) {
    const completedMigrations = (await database
        .select('*')
        .from(HF_MIGRATION_TABLE_NAME)
        .orderBy('version')) as MyMigrations[];

    logger.info(`Found ${completedMigrations.length} migrations in db`);

    return completedMigrations
}

export async function addCompletedMigration(database: Knex, migration: MyMigrations) {
    await database
    .insert({
      version: migration.version,
      name: migration.name as string,
    })
    .into(HF_MIGRATION_TABLE_NAME);
}