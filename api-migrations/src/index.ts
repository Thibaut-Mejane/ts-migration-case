import { defineHook } from '@directus/extensions-sdk';
import path from 'node:path';
import { retryAsync } from 'ts-retry';
import {
  buildConnectionUrlFromEnvVariables,
  getConnectionHeaders,
} from './utils/config';
import { MigrationFile, MyMigrationsUp } from './utils/types';
import { getCompletedMigration } from './services/DatabaseService';
import { getMigrationFile, getCustomerMigrationFile, parseFileName } from './services/MigrationFileService';

const HF_MIGRATION_TABLE_NAME = 'my_migrations';

export default defineHook(({ action }, hookExtensionContext) => {
  let { logger, database } = hookExtensionContext;
  logger = logger.child({ name: 'api-migrations' });

  const enableMigration = process.env.HF_ENABLE_API_MIGRATION === 'true';
  if (!enableMigration) {
    logger.info('Hook is not enabled. Your migrations will not be proceeded.');
    return;
  }

  const connectionUrl = buildConnectionUrlFromEnvVariables();

  action('server.start', (): void => {
    const handler = async () => {
      // Action hooks executes when server starts
      logger.info('Running My migrations...');

      // Get Completed migrations from database
      const completedMigrations = await getCompletedMigration(logger, database)

      // Get migrations files
      const migrationFiles = getMigrationFile()
      
      // Get Customer migration files
      const customerMigrationFiles = getCustomerMigrationFile(logger);

      // Compose the final migrations file list with the default ones and the customer ones
      let migrations: MigrationFile[];

      migrations = [
        ...migrationFiles.map((filename) => parseFileName(filename,false, completedMigrations)),
        ...customerMigrationFiles.map((filename) =>
          parseFileName(filename, true, completedMigrations)
        ),
      ].sort((a, b) => (a.version > b.version ? 1 : -1));

      logger.info(`Found ${migrations.length} My migrations file`);

      const migrationKeys = new Set(migrations.map((m) => m.version));
      if (migrations.length > migrationKeys.size) {
        throw new Error(
          'Migration keys collide! Please ensure that every migration uses a unique key.'
        );
      }

      if (migrations && migrations.length > 0) {
        const headers = getConnectionHeaders();
        if (!headers) {
          logger.error(
            `No headers generated, migrations will not be run !`
          );
          return;
        }
        const migrationsToApply = migrations.filter((m) => !m.completed);
        logger.info(`${migrationsToApply.length} migrations left to apply`);
        for (const migration of migrationsToApply) {
          const migrationName = migration.name as string;
          logger.info(`Applying "${migrationName}" ...`);
          // eslint-disable-next-line  @typescript-eslint/no-var-requires
          const { up } = require(migration.file) as {
            up: MyMigrationsUp;
          };
          try {
            await retryAsync(
              async () => {
                await up(connectionUrl, headers);
              },
              { delay: 1000, maxTry: 2 }
            );
            logger.info(`migration "${migrationName}" ✔ Done`);
            await database
              .insert({
                version: migration.version,
                name: migrationName,
              })
              .into(HF_MIGRATION_TABLE_NAME);
          } catch (error) {
            logger.info(`Error during migration: "${migrationName}"`);
            logger.error(error);
            return;
          }
        }
      }
      logger.info('My migrations. ✔ Done');
    };
    handler().catch((err) => {
      logger.error(err);
    });
  });
});
