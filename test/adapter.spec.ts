import { Enforcer, newEnforcer } from "casbin";
import * as objection from "objection";
import * as path from "path";
import { CasbinRule, ObjectionAdapter } from "../src";
import { makeAndConfigureDatabase } from "./utils";

describe("ObjectionAdapter", () => {
  let adapter: ObjectionAdapter;
  let enforcer: Enforcer;

  const knex = makeAndConfigureDatabase(__dirname);

  beforeEach(async () => {
    adapter = await ObjectionAdapter.newAdapter(knex);

    enforcer = await newEnforcer(
      path.join(__dirname, "basic_model.conf"),
      adapter,
    );
    enforcer.enableAutoSave(true);
  });

  afterEach(async () => {
    await adapter.dropTable();
  });

  afterAll(async () => {
    await knex.destroy();
  });

  test("it creates the table by default", async () => {
    const defaultTableName = adapter["options"].tableName;
    const hasTable = await knex.schema.hasTable(defaultTableName);

    expect(hasTable).toBe(true);
  });

  test("does not create the table automatically if specified", async () => {
    await adapter.dropTable();

    const defaultTableName = adapter["options"].tableName;

    adapter = await ObjectionAdapter.newAdapter(knex, {
      createTable: false,
    });

    const hasTable = await knex.schema.hasTable(defaultTableName);

    expect(hasTable).toBe(false);
  });

  test("uses the custom model provided by the user to create the table", async () => {
    await adapter.dropTable();
    const defaultTableName = adapter["options"].tableName;

    class MyCustomPolicy extends objection.Model {
      static tableName = "my_custom_policies";

      ptype!: string;
      v0!: string;
      v1!: string;
      v2!: string;
      v3!: string;
      v4!: string;
      v5!: string;
    }

    adapter = await ObjectionAdapter.newAdapter(knex, {
      modelClass: MyCustomPolicy,
    });

    const hasCustomTable = await knex.schema.hasTable(MyCustomPolicy.tableName);
    const hasTable = await knex.schema.hasTable(defaultTableName);

    expect(hasCustomTable).toBe(true);
    expect(hasTable).toBe(false);
  });

  test("can correctly load policies from the database", async () => {
    enforcer.enableAutoSave(false);

    await enforcer.addPolicies([
      ["alice", "data1", "read"],
      ["bob", "data2", "write"],
    ]);
    await expect(enforcer.savePolicy()).resolves.toBe(true);

    // reload the policy to ensure changes were persisted
    await enforcer.loadPolicy();

    await expect(enforcer.hasPolicy("alice", "data1", "read")).resolves.toBe(
      true,
    );
    await expect(enforcer.hasPolicy("bob", "data2", "write")).resolves.toBe(
      true,
    );
  });

  test("supports more advanced policies", async () => {
    const policy = ["alice", "data1", "read", "write", "copy"];

    await enforcer.addPolicy(...policy);

    await expect(CasbinRule.query()).resolves.toHaveLength(1);
    await expect(enforcer.hasPolicy(...policy)).resolves.toBe(true);
  });
});
