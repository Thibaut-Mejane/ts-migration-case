import { retryAsync } from "ts-retry";
import { buildConnectionUrlFromEnvVariables, getConnectionHeaders } from "../utils/config";
import { MigrationFile, MyMigrationsUp } from "../utils/types";
import { addCompletedMigration, getCompletedMigration } from "./DatabaseService";
import { getMigrationFiles } from "./MigrationFileService";
import { Logger } from "pino";

const connectionUrl = buildConnectionUrlFromEnvVariables();

export async function migrateFile(logger : Logger, database) {
    logger.info('Running My migrations...');

    // Get Completed migrations from database
    const completedMigrations = await getCompletedMigration(logger, database)

    // Get All Migration files
    const migrations= getMigrationFiles(logger, completedMigrations) as MigrationFile[]

    if (migrations && migrations.length > 0) {
      const headers = getConnectionHeaders();

      if (!headers) {
        logger.error(
          `No headers generated, migrations will not be run !`
        );
        return;
      }

      logger.info(`${migrations.length} migrations left to apply`);

      for (const migration of migrations) {

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
}