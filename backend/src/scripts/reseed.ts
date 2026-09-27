import "dotenv/config";
import { ensureSchema, pool } from "../db/client";
import { seedAll } from "../db/seed";

async function main() {
  await ensureSchema();
  const result = await seedAll(true);
  console.log(
    `База перезаполнена: классов ${result.classCount}, уроков ${result.lessonCount}, оценок ${result.gradeCount}`
  );
  await pool.end();
}

main().catch((error) => {
  console.error("Не удалось перезаполнить базу:", error);
  process.exit(1);
});
