import { Enforcer, newEnforcer } from "casbin";
import * as path from "path";
import { CasbinRule, ObjectionAdapter } from "../../src";
import { makeAndConfigureDatabase } from "../utils";

describe("ObjectionAdapter (ACL)", () => {
  let adapter: ObjectionAdapter;
  let enforcer: Enforcer;

  const policies = {
    alice: ["alice", "data1", "read"],
    bob: ["bob", "data2", "write"],
    stark: ["tony", "data3", "root"],
  };

  const knex = makeAndConfigureDatabase(__dirname);

  beforeEach(async () => {
    adapter = await ObjectionAdapter.newAdapter(knex);

    enforcer = await newEnforcer(
      path.join(__dirname, "basic_with_root_model.conf"),
      adapter,
    );
    enforcer.enableAutoSave(true);

    await enforcer.addPolicies([policies.alice, policies.bob, policies.stark]);
  });

  afterEach(async () => {
    await adapter.dropTable();
  });

  afterAll(async () => {
    await knex.destroy();
  });

  test("it correctly enforces the policies", async () => {
    await expect(enforcer.enforce("alice", "data1", "read")).resolves.toBe(
      true,
    );
    await expect(enforcer.enforce("bob", "data1", "read")).resolves.toBe(false);
    await expect(enforcer.enforce("tony", "data1", "root")).resolves.toBe(
      false,
    );
    await expect(enforcer.enforce("tony", "data3", "root")).resolves.toBe(true);
  });

  test("enforcer.getAllSubjects", async () => {
    await expect(enforcer.getAllSubjects()).resolves.toEqual([
      "alice",
      "bob",
      "tony",
    ]);
  });

  test("enforcer.getAllNamedSubjects", async () => {
    await expect(enforcer.getAllNamedSubjects("p")).resolves.toEqual([
      "alice",
      "bob",
      "tony",
    ]);
  });

  test("enforcer.getAllObjects", async () => {
    await expect(enforcer.getAllObjects()).resolves.toEqual([
      "data1",
      "data2",
      "data3",
    ]);
  });

  test("enforcer.getAllNamedObjects", async () => {
    await expect(enforcer.getAllNamedObjects("p")).resolves.toEqual([
      "data1",
      "data2",
      "data3",
    ]);
  });

  test("enforcer.getAllActions", async () => {
    await expect(enforcer.getAllActions()).resolves.toEqual([
      "read",
      "write",
      "root",
    ]);
  });

  test("enforcer.getAllNamedActions", async () => {
    await expect(enforcer.getAllNamedActions("p")).resolves.toEqual([
      "read",
      "write",
      "root",
    ]);
  });

  test("enforcer.getAllRoles", async () => {
    await expect(enforcer.getAllRoles()).resolves.toEqual([]);
  });

  test("enforcer.getAllNamedRoles", async () => {
    await expect(enforcer.getAllNamedRoles("p")).resolves.toEqual([]);
  });

  test("enforcer.getPolicy", async () => {
    await expect(enforcer.getPolicy()).resolves.toEqual([
      policies.alice,
      policies.bob,
      policies.stark,
    ]);
  });

  test("enforcer.getFilteredPolicy", async () => {
    await expect(enforcer.getFilteredPolicy(0, "alice")).resolves.toEqual([
      policies.alice,
    ]);
  });

  test("enforcer.getNamedPolicy", async () => {
    await expect(enforcer.getNamedPolicy("p")).resolves.toEqual([
      policies.alice,
      policies.bob,
      policies.stark,
    ]);
  });

  test("enforcer.getFilteredNamedPolicy", async () => {
    await expect(
      enforcer.getFilteredNamedPolicy("p", 0, "bob"),
    ).resolves.toEqual([policies.bob]);
  });

  test("enforcer.getGroupingPolicy", async () => {
    await expect(enforcer.getGroupingPolicy()).resolves.toEqual([]);
  });

  test("enforcer.getNamedGroupingPolicy", async () => {
    await expect(enforcer.getNamedGroupingPolicy("p")).resolves.toEqual([]);
  });

  test("enforcer.getFilteredNamedGroupingPolicy", async () => {
    await expect(
      enforcer.getFilteredNamedGroupingPolicy("p", 0, "bob"),
    ).resolves.toEqual([]);
  });

  test("enforcer.hasPolicy", async () => {
    await expect(enforcer.hasPolicy("alice", "data1", "read")).resolves.toEqual(
      true,
    );

    await expect(
      enforcer.hasPolicy("alice", "data2", "write"),
    ).resolves.toEqual(false);
  });

  test("enforcer.hasNamedPolicy", async () => {
    await expect(
      enforcer.hasNamedPolicy("p", "alice", "data1", "read"),
    ).resolves.toEqual(true);

    await expect(
      enforcer.hasNamedPolicy("g", "alice", "data1", "read"),
    ).resolves.toEqual(false);
  });

  describe("enforcer.addPolicy", () => {
    test("adds the new policy and saves it", async () => {
      const result = await enforcer.addPolicy("thor", "data1", "write");
      const rules = await CasbinRule.query();

      expect(result).toBe(true);
      expect(rules).toHaveLength(4);
    });

    test("returns false if the rule already exists", async () => {
      const result = await enforcer.addPolicy(...policies.alice);
      const rules = await CasbinRule.query();

      expect(result).toBe(false);
      expect(rules).toHaveLength(3);
    });
  });

  describe("enforcer.addPolicies", () => {
    test("adds the new policies and saves them if there are no conflicts", async () => {
      const result = await enforcer.addPolicies([
        ["thor", "data1", "write"],
        ["cap", "data3", "read"],
      ]);
      const rules = await CasbinRule.query();

      expect(result).toBe(true);
      expect(rules).toHaveLength(5);
    });

    test("returns false if any of the policies already exist", async () => {
      const result = await enforcer.addPolicies([
        ["thor", "data1", "write"],
        ["cap", "data3", "read"],
        policies.alice,
      ]);

      expect(result).toBe(false);
    });

    test("does not persist anything if a policy already exists", async () => {
      await enforcer.addPolicies([
        ["thor", "data1", "write"],
        ["cap", "data3", "read"],
        policies.alice,
      ]);
      const rules = await CasbinRule.query();

      expect(rules).toHaveLength(3);
    });
  });

  describe("enforcer.addNamedPolicy", () => {
    test("adds the new policy and saves it", async () => {
      const result = await enforcer.addNamedPolicy(
        "p",
        "thor",
        "data1",
        "write",
      );
      const rules = await CasbinRule.query();

      expect(result).toBe(true);
      expect(rules).toHaveLength(4);
    });

    test("returns false if the rule already exists", async () => {
      const result = await enforcer.addNamedPolicy("p", ...policies.alice);
      const rules = await CasbinRule.query();

      expect(result).toBe(false);
      expect(rules).toHaveLength(3);
    });
  });

  describe("enforcer.addNamedPolicies", () => {
    test("adds the new policies and saves them if there are no conflicts", async () => {
      const result = await enforcer.addNamedPolicies("p", [
        ["thor", "data1", "write"],
        ["cap", "data3", "read"],
      ]);
      const rules = await CasbinRule.query();

      expect(result).toBe(true);
      expect(rules).toHaveLength(5);
    });

    test("returns false if any of the policies already exist", async () => {
      const result = await enforcer.addNamedPolicies("p", [
        ["thor", "data1", "write"],
        ["cap", "data3", "read"],
        policies.alice,
      ]);

      expect(result).toBe(false);
    });

    test("does not persist anything if a policy already exists", async () => {
      await enforcer.addNamedPolicies("p", [
        ["thor", "data1", "write"],
        ["cap", "data3", "read"],
        policies.alice,
      ]);
      const rules = await CasbinRule.query();

      expect(rules).toHaveLength(3);
    });
  });

  test("enforcer.removePolicy", async () => {
    await expect(enforcer.removePolicy(...policies.alice)).resolves.toEqual(
      true,
    );

    await expect(
      enforcer.removePolicy("alice", "data2", "write"),
    ).resolves.toEqual(false);

    await expect(CasbinRule.query()).resolves.toHaveLength(2);
  });

  test("enforcer.removePolicies", async () => {
    await expect(
      enforcer.removePolicies([policies.alice, policies.bob]),
    ).resolves.toEqual(true);

    await expect(
      enforcer.removePolicies([["alice", "data2", "write"]]),
    ).resolves.toEqual(false);

    await expect(CasbinRule.query()).resolves.toHaveLength(1);
  });

  test("enforcer.removeFilteredPolicy", async () => {
    const subject = "alice"; // the user that wants to access a resource.
    const resource = "data1"; // the resource that is going to be accessed.
    const action = "read"; // the operation that the user performs on the resource.

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

  test("enforcer.removeNamedPolicy", async () => {
    await expect(
      enforcer.removeNamedPolicy("p", ...policies.alice),
    ).resolves.toBe(true);
    await expect(
      enforcer.removeNamedPolicy("p", "thor", "data", "write"),
    ).resolves.toBe(false);
  });

  test("enforcer.removeNamedPolicies", async () => {
    await expect(
      enforcer.removeNamedPolicies("p", [policies.alice, policies.bob]),
    ).resolves.toBe(true);

    await expect(CasbinRule.query()).resolves.toHaveLength(1);

    await expect(
      enforcer.removeNamedPolicies("p", [["thor", "data", "write"]]),
    ).resolves.toBe(false);
  });

  test("enforcer.removeFilteredNamedPolicy", async () => {
    await expect(
      enforcer.removeFilteredNamedPolicy("p", 0, ...policies.alice),
    ).resolves.toBe(true);
  });
});
