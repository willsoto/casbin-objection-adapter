import { Enforcer, newEnforcer } from "casbin";
import Knex from "knex";
import * as path from "path";
import { ObjectionAdapter } from "../src/adapter";
import { CasbinRule } from "../src/model";

const knex = Knex({
  client: "pg",
  asyncStackTraces: true,
  connection: {
    host: process.env.POSTGRES_HOST || "localhost",
    port: 5432,
    database: process.env.POSTGRES_DB || "casbin",
    user: process.env.POSTGRES_USER || "casbin",
    password: process.env.POSTGRES_PASSWORD || "casbin",
  },
});

// knex.on("query", console.log);

CasbinRule.knex(knex);

describe("ObjectionAdapterOptions", () => {
  let adapter: ObjectionAdapter;
  let enforcer: Enforcer;

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

  const subject = "alice"; // the user that wants to access a resource.
  const resource = "data1"; // the resource that is going to be accessed.
  const action = "read"; // the operation that the user performs on the resource.

  test("it creates the table by default", async () => {
    const defaultTableName = adapter["options"].tableName;
    const hasTable = await knex.schema.hasTable(defaultTableName);

    expect(hasTable).toBe(true);
  });

  test("it correctly enforces the policies", async () => {
    await enforcer.addPolicy("alice", "data1", "read");

    const result = await enforcer.enforce(subject, resource, action);

    expect(result).toBe(true);
  });

  test("returns false if the rule already exists", async () => {
    let result = await enforcer.addPolicy("alice", "data1", "read");

    expect(result).toBe(true);

    result = await enforcer.addPolicy("alice", "data1", "read");

    expect(result).toBe(false);
  });

  test("implements RemoveFilteredPolicy", async () => {
    await enforcer.addPolicy("alice", "data1", "read");

    let result = await enforcer.enforce(subject, resource, action);
    let hasPolicy = await enforcer.hasPolicy(subject, resource, action);

    expect(hasPolicy).toBe(true);
    expect(result).toBe(true);

    await enforcer.removeFilteredPolicy(0, subject, resource, action);

    hasPolicy = await enforcer.hasPolicy(subject, resource, action);
    result = await enforcer.enforce(subject, resource, action);

    expect(hasPolicy).toBe(false);
    expect(result).toBe(false);
  });
});
