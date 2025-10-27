import fs from "fs";
import db from "./ultis/db.js"; 

const SCHEMA_NAME = "public"; 

(async () => {
  try {
    const columns = await db
      .select("table_name", "column_name", "data_type")
      .from("information_schema.columns")
      .where("table_schema", SCHEMA_NAME)
      .orderBy(["table_name", "ordinal_position"]);

    const foreignKeys = await db.raw(`
      SELECT
        conrelid::regclass AS table_name,
        a.attname AS column_name,
        confrelid::regclass AS referenced_table_name,
        af.attname AS referenced_column_name
      FROM
        pg_constraint AS c
        JOIN pg_attribute AS a
          ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
        JOIN pg_attribute AS af
          ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
      WHERE
        c.contype = 'f'
      ORDER BY table_name, column_name;
    `);

    const tables = {};
    for (const col of columns) {
      if (!tables[col.table_name]) tables[col.table_name] = [];
      tables[col.table_name].push({
        column: col.column_name,
        type: col.data_type,
      });
    }

    const relations = {};
    for (const fk of foreignKeys.rows) {
      const t = fk.table_name;
      if (!relations[t]) relations[t] = [];
      relations[t].push({
        from: `${fk.table_name}.${fk.column_name}`,
        to: `${fk.referenced_table_name}.${fk.referenced_column_name}`,
      });
    }

    let markdown = `# 🗄 Database Schema (PostgreSQL / Supabase)\n\n`;

    for (const [table, cols] of Object.entries(tables)) {
      markdown += `## Table: \`${table}\`\n\n`;
      markdown += `| Column | Type |\n|--------|------|\n`;
      cols.forEach((c) => {
        markdown += `| ${c.column} | ${c.type} |\n`;
      });
      markdown += `\n`;

      if (relations[table]) {
        markdown += `**Relations:**\n`;
        relations[table].forEach((r) => {
          markdown += `- \`${r.from}\` → \`${r.to}\`\n`;
        });
        markdown += `\n`;
      }
    }

    fs.writeFileSync("DB_SCHEMA.md", markdown);
    console.log("Database schema with relations exported to DB_SCHEMA.md");
    process.exit(0);
  } catch (err) {
    console.error("❌ Failed to export schema:", err);
    process.exit(1);
  }
})();
