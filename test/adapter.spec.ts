import { Enforcer, newEnforcer } from "casbin";
import { expect } from "chai";
import Knex from "knex";
import objection from "objection";
import path from "path";
import { CasbinRule, ObjectionAdapter } from "../src";
import { makeAndConfigureDatabase } from "./utils";

describe("ObjectionAdapter", function () {
  let adapter: ObjectionAdapter;
  let enforcer: Enforcer;
  let knex: Knex;

  before(function () {
    knex = makeAndConfigureDatabase(__dirname);
  });

  beforeEach(async function () {
    adapter = await ObjectionAdapter.newAdapter(knex);

    enforcer = await newEnforcer(
      path.join(__dirname, "basic_model.conf"),
      adapter,
    );
    enforcer.enableAutoSave(true);
  });

  afterEach(async function () {
    await adapter.dropTable();
  });

  after(async function () {
    await knex.destroy();
  });

  it("it creates the table by default", async function () {
    const defaultTableName = adapter["tableName"];
    const hasTable = await knex.schema.hasTable(defaultTableName);

    expect(hasTable).to.eql(true);
  });

  it("does not create the table automatically if specified", async function () {
    await adapter.dropTable();

    const defaultTableName = adapter["tableName"];

    adapter = await ObjectionAdapter.newAdapter(knex, {
      createTable: false,
    });

    const hasTable = await knex.schema.hasTable(defaultTableName);

    expect(hasTable).to.eql(false);
  });

  it("uses the custom model provided by the user to create the table", async function () {
    await adapter.dropTable();
    const defaultTableName = adapter["tableName"];

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

    expect(hasCustomTable).to.eql(true);
    expect(hasTable).to.eql(false);
  });

  it("can correctly load policies from the database", async function () {
    enforcer.enableAutoSave(false);

    await enforcer.addPolicies([
      ["alice", "data1", "read"],
      ["bob", "data2", "write"],
    ]);
    await expect(enforcer.savePolicy()).to.eventually.eql(true);

    // reload the policy to ensure changes were persisted
    await enforcer.loadPolicy();

    await expect(
      enforcer.hasPolicy("alice", "data1", "read"),
    ).to.eventually.eql(true);
    await expect(enforcer.hasPolicy("bob", "data2", "write")).to.eventually.eql(
      true,
    );
  });

  it("supports more advanced policies", async function () {
    const policy = ["alice", "data1", "read", "write", "copy"];

    await enforcer.addPolicy(...policy);

    await expect(CasbinRule.query()).to.eventually.have.length(1);
    await expect(enforcer.hasPolicy(...policy)).to.eventually.eql(true);
  });
});
