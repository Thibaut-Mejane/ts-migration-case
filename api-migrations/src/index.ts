import { defineHook } from '@directus/extensions-sdk';
import { retryAsync } from 'ts-retry';
import {
  buildConnectionUrlFromEnvVariables,
  getConnectionHeaders,
} from './utils/config';
import { MigrationFile, MyMigrationsUp } from './utils/types';
import { addCompletedMigration, getCompletedMigration } from './services/DatabaseService';
import { getMigrationFiles } from './services/MigrationFileService';

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

      // Get All Migration files
      let migrations= getMigrationFiles(logger, completedMigrations) as MigrationFile[]

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
            await addCompletedMigration(database, migration);
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
