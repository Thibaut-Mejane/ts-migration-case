import { MyMigrations, } from '../utils/types';
import { Knex } from 'knex';

const HF_MIGRATION_TABLE_NAME = 'my_migrations';

export async function getCompletedMigration(database: Knex) {
    return await database
        .select('*')
        .from(HF_MIGRATION_TABLE_NAME)
        .orderBy('version') as MyMigrations[]
}

export async function addCompletedMigration(database: Knex, migration: MyMigrations) {
    await database
    .insert({
    version: migration.version,
    name: migration.name as string,
    })
    .into(HF_MIGRATION_TABLE_NAME);
}