import { Enforcer, newEnforcer } from "casbin";
import { expect } from "chai";
import { Knex } from "knex";
import path from "path";
import { ObjectionAdapter } from "../../src";
import { makeAndConfigureDatabase } from "../utils";

describe("ObjectionAdapter (ABAC)", function () {
  let adapter: ObjectionAdapter;
  let enforcer: Enforcer;
  let data1: TestResource;
  let data2: TestResource;
  let knex: Knex;

  class TestResource {
    public Name: string;
    public Owner: string;

    constructor(name: string, owner: string) {
      // eslint-disable-next-line mocha/no-setup-in-describe
      this.Name = name;
      // eslint-disable-next-line mocha/no-setup-in-describe
      this.Owner = owner;
    }
  }

  before(function () {
    knex = makeAndConfigureDatabase(__dirname);
  });

  beforeEach(async function () {
    adapter = await ObjectionAdapter.newAdapter(knex);

    enforcer = await newEnforcer(
      path.join(__dirname, "abac_model.conf"),
      adapter,
    );
    enforcer.enableAutoSave(true);

    data1 = new TestResource("data1", "alice");
    data2 = new TestResource("data2", "bob");
  });

  afterEach(async function () {
    await adapter.dropTable();
  });

  after(async function () {
    await knex.destroy();
  });

  it("it correctly enforces the policies", async function () {
    await expect(enforcer.enforce("alice", data1, "read")).to.eventually.eql(
      true,
    );
    await expect(enforcer.enforce("alice", data1, "write")).to.eventually.eql(
      true,
    );
    await expect(enforcer.enforce("alice", data2, "read")).to.eventually.eql(
      false,
    );
    await expect(enforcer.enforce("alice", data2, "write")).to.eventually.eql(
      false,
    );

    await expect(enforcer.enforce("bob", data1, "read")).to.eventually.eql(
      false,
    );
    await expect(enforcer.enforce("bob", data1, "write")).to.eventually.eql(
      false,
    );
    await expect(enforcer.enforce("bob", data2, "read")).to.eventually.eql(
      true,
    );
    await expect(enforcer.enforce("bob", data2, "write")).to.eventually.eql(
      true,
    );
  });
});
