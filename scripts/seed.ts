/**
 * Seeds the local database with the sample content set. Safe to re-run: it only
 * inserts when the puzzles table is empty.
 */
import { getDb } from "../src/db/client";
import { listAllPuzzles } from "../src/db/queries";

const db = getDb();
const puzzles = listAllPuzzles(db);

console.log(`Guessee database ready at ${process.env.GUESSEE_DB_PATH || "./data/guessee.db"}`);
console.log(`${puzzles.length} puzzles loaded.`);
for (const puzzle of puzzles) {
  console.log(
    `  ${puzzle.id.padEnd(14)} ${puzzle.status.padEnd(10)} ${puzzle.kind.padEnd(9)} ${
      puzzle.scheduledDate ?? "unscheduled"
    }`,
  );
}

db.close();
