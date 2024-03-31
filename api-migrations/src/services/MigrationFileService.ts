import { existsSync, readdirSync } from "node:fs";
import path from 'node:path';
import { getCustomerName } from '../utils/config';
import { MyMigrations } from "../utils/types";

const MIGRATIONS_FOLDER_NAME = 'migrations';
const migrationsFolderPath = path.join(__dirname, MIGRATIONS_FOLDER_NAME);


export function getMigrationFile() {
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

export function getCustomerMigrationFile(logger) {
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

export function parseFileName(fileName: string, custom = false, completedMigrations: MyMigrations[]) {
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