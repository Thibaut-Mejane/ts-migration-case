import { defineHook } from '@directus/extensions-sdk';
import { migrateFile } from './services/MigrationService';

export default defineHook(({ action }, hookExtensionContext) => {
  let { logger, database } = hookExtensionContext;
  logger = logger.child({ name: 'api-migrations' });

  const enableMigration = process.env.HF_ENABLE_API_MIGRATION === 'true';
  if (!enableMigration) {
    logger.info('Hook is not enabled. Your migrations will not be proceeded.');
    return;
  }

  action('server.start', (): void => {
    const handler = async () => {
      // Action hooks executes when server starts
      await migrateFile(logger, database)
    };
    handler().catch((err) => {
      logger.error(err);
    });
  });
});
