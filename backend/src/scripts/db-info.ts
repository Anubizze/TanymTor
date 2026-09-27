import "dotenv/config";
import { pool } from "../db/client";

async function main() {
  const { rows: info } = await pool.query<{
    db: string;
    usr: string;
    version: string;
  }>("SELECT current_database() AS db, current_user AS usr, version() AS version");

  console.log(`База:         ${info[0].db}`);
  console.log(`Пользователь: ${info[0].usr}`);
  console.log(`Сервер:       ${info[0].version.split(",")[0]}`);

  const { rows: tables } = await pool.query<{
    table_name: string;
    columns: number;
  }>(`
    SELECT t.table_name,
           (SELECT count(*)::int
              FROM information_schema.columns c
             WHERE c.table_schema = t.table_schema
               AND c.table_name = t.table_name) AS columns
      FROM information_schema.tables t
     WHERE t.table_schema = 'public'
       AND t.table_type = 'BASE TABLE'
     ORDER BY t.table_name
  `);

  if (tables.length === 0) {
    console.log("\nТаблиц в схеме public нет.");
  } else {
    console.log(`\nТаблиц в схеме public: ${tables.length}`);
    for (const table of tables) {
      const { rows } = await pool.query<{ count: string }>(
        `SELECT count(*) AS count FROM "${table.table_name}"`
      );
      console.log(
        `  ${table.table_name.padEnd(16)} колонок: ${String(table.columns).padEnd(3)} строк: ${rows[0].count}`
      );
    }
  }

  await pool.end();
}

main().catch((error) => {
  console.error("Не удалось прочитать состояние базы:", error.message);
  process.exit(1);
});
