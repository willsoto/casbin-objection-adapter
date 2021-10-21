import knex, { Knex } from "knex";
import path from "path";

export function makeAndConfigureDatabase(dirname: string): Knex {
  return knex({
    client: "sqlite3",
    useNullAsDefault: true,
    asyncStackTraces: true,
    connection: {
      filename: path.join(dirname, "casbin.sqlite"),
    },
  });
}
