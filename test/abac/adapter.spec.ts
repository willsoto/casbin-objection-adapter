import { Enforcer, newEnforcer } from "casbin";
import * as path from "path";
import { ObjectionAdapter } from "../../src";
import { makeAndConfigureDatabase } from "../utils";

describe("ObjectionAdapter (ABAC)", () => {
  let adapter: ObjectionAdapter;
  let enforcer: Enforcer;
  let data1: TestResource;
  let data2: TestResource;

  const knex = makeAndConfigureDatabase(__dirname);

  class TestResource {
    public Name: string;
    public Owner: string;

    constructor(name: string, owner: string) {
      this.Name = name;
      this.Owner = owner;
    }
  }

  beforeEach(async () => {
    adapter = await ObjectionAdapter.newAdapter();

    enforcer = await newEnforcer(
      path.join(__dirname, "abac_model.conf"),
      adapter,
    );
    enforcer.enableAutoSave(true);

    data1 = new TestResource("data1", "alice");
    data2 = new TestResource("data2", "bob");
  });

  afterEach(async () => {
    await adapter.dropTable();
  });

  afterAll(async () => {
    await knex.destroy();
  });

  test("it correctly enforces the policies", async () => {
    await expect(enforcer.enforce("alice", data1, "read")).resolves.toBe(true);
    await expect(enforcer.enforce("alice", data1, "write")).resolves.toBe(true);
    await expect(enforcer.enforce("alice", data2, "read")).resolves.toBe(false);
    await expect(enforcer.enforce("alice", data2, "write")).resolves.toBe(
      false,
    );

    await expect(enforcer.enforce("bob", data1, "read")).resolves.toBe(false);
    await expect(enforcer.enforce("bob", data1, "write")).resolves.toBe(false);
    await expect(enforcer.enforce("bob", data2, "read")).resolves.toBe(true);
    await expect(enforcer.enforce("bob", data2, "write")).resolves.toBe(true);
  });
});
