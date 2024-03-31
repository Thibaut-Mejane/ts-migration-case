import { existsSync, readdirSync } from "node:fs";
import path from 'node:path';
import { getCustomerName } from '../utils/config';
import { MyMigrations } from "../utils/types";

const MIGRATIONS_FOLDER_NAME = 'migrations';
const migrationsFolderPath = path.join(__dirname, MIGRATIONS_FOLDER_NAME);


function getDefaultMigrationFile() {
    return readdirSync(migrationsFolderPath).filter((file) =>
        file.endsWith('.js')
    );
}

function getCustomerMigrationFolderPath() {
    return path.join(
        migrationsFolderPath,
        getCustomerName()
      );
}

function getCustomerMigrationFile(logger) {
    let customerMigrationsFolderPath: string;
    let customerMigrationFiles: string[];

    try {
        customerMigrationsFolderPath = getCustomerMigrationFolderPath()

        customerMigrationFiles = existsSync(customerMigrationsFolderPath)
          ? readdirSync(customerMigrationsFolderPath).filter((file) =>
              file.endsWith('.js')
            )
          : [];

          return customerMigrationFiles
    } catch(error) {
        logger.info(
            `Customer name is not set. Only general migrations will run.`
            );
            logger.warn(error);
        return []
    }
}

function parseFileName(fileName: string, custom = false, completedMigrations: MyMigrations[]) {
    const customerMigrationsFolderPath = getCustomerMigrationFolderPath()
    const version = fileName.split('-')[0] || '-1';
    return {
      file: path.join(
        custom ? customerMigrationsFolderPath : migrationsFolderPath,
        fileName
      ),
      name: fileName.split('-').slice(1).join(' ').split('.')[0],
      version: version,
      completed: !!completedMigrations.find(
        (migration) => migration.version === version
      ),
    };
  }

  // Compose the final migrations file list with the default ones and the customer ones
  export function getMigrationFiles(logger, completedMigrations: MyMigrations[]) {
   // Get migrations files
   const migrationFiles = getDefaultMigrationFile()
      
   // Get Customer migration files
   const customerMigrationFiles = getCustomerMigrationFile(logger);

   // Compose the final migrations file list with the default ones and the customer ones
   const migrations = [
     ...migrationFiles.map((filename) => parseFileName(filename,false, completedMigrations)),
     ...customerMigrationFiles.map((filename) =>
       parseFileName(filename, true, completedMigrations)
     ),
   ].sort((a, b) => (a.version > b.version ? 1 : -1));

   logger.info(`Found ${migrations.length} My migrations file`);
   
   // Check if there's some duplicated version
   const migrationKeys = new Set(migrations.map((m) => m.version));
   if (migrations.length > migrationKeys.size) {
     throw new Error(
       'Migration keys collide! Please ensure that every migration uses a unique key.'
     );
   }
   
   return migrations

  }