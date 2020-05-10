import Knex from "knex";
import * as path from "path";

export function makeAndConfigureDatabase(dirname: string): Knex {
  const knex = Knex({
    client: "sqlite3",
    useNullAsDefault: true,
    asyncStackTraces: true,
    connection: {
      filename: path.join(dirname, "casbin.sqlite"),
    },
  });

  return knex;
}
