import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

import { SCHEMA_SQL } from "./schema";
import { seedIfEmpty } from "./seed";

export type Db = Database.Database;

let instance: Db | null = null;

function resolvePath(): string {
  const configured = process.env.GUESSEE_DB_PATH;
  if (!configured) return path.join(process.cwd(), "data", "guessee.db");
  return path.isAbsolute(configured)
    ? configured
    : path.join(/* turbopackIgnore: true */ process.cwd(), configured);
}

export function openDatabase(filePath: string = resolvePath()): Db {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  const db = new Database(filePath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA_SQL);

  return db;
}

/**
 * Process-wide connection. Kept module-level so Next's dev server does not open
 * a new handle on every hot reload.
 */
export function getDb(): Db {
  if (!instance) {
    instance = openDatabase();
    seedIfEmpty(instance);
  }
  return instance;
}
