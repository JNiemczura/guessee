/**
 * Prints the content-coverage report and exits non-zero when a day is uncovered
 * or the reviewed buffer is too thin. Safe to run from a local cron job.
 */
import { getDb } from "../src/db/client";
import { checkCoverage } from "../src/server/alerting";

const db = getDb();
const alert = checkCoverage(db);

console.log(alert.message);
console.log(`checked ${alert.checkedDays} days, ${alert.coveredAhead} covered ahead`);

for (const day of alert.missing) {
  console.log(`  missing: ${day.dateKey}  ${day.label}`);
}

if (alert.status === "ok") {
  console.log("coverage OK");
  db.close();
  process.exit(0);
}

console.error("coverage NOT OK");
db.close();
process.exit(1);
