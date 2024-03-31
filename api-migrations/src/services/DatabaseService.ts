import { MyMigrations, } from '../utils/types';


const HF_MIGRATION_TABLE_NAME = 'my_migrations';


export async function getCompletedMigration(logger, database) {
    const completedMigrations = (await database
        .select('*')
        .from(HF_MIGRATION_TABLE_NAME)
        .orderBy('version')) as MyMigrations[];

    logger.info(`Found ${completedMigrations.length} migrations in db`);

    return completedMigrations
}