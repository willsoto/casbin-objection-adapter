import { Enforcer, newEnforcer } from "casbin";
import * as path from "path";
import { CasbinRule, ObjectionAdapter } from "../../src";
import { makeAndConfigureDatabase } from "../utils";

describe("ObjectionAdapter (RBAC)", () => {
  let adapter: ObjectionAdapter;
  let enforcer: Enforcer;

  const policies = {
    alice: ["alice", "data1", "read"],
    bob: ["bob", "data2", "write"],
    data2AdminRead: ["data2_admin", "data2", "read"],
    data2AdminWrite: ["data2_admin", "data2", "write"],
  };

  const knex = makeAndConfigureDatabase(__dirname);

  beforeEach(async () => {
    adapter = await ObjectionAdapter.newAdapter();

    enforcer = await newEnforcer(
      path.join(__dirname, "rbac_model.conf"),
      adapter,
    );
    enforcer.enableAutoSave(true);

    await enforcer.addPolicies([
      policies.alice,
      policies.bob,
      policies.data2AdminRead,
      policies.data2AdminWrite,
    ]);
    await enforcer.addRoleForUser("alice", "data2_admin");
  });

  afterEach(async () => {
    await adapter.dropTable();
  });

  afterAll(async () => {
    await knex.destroy();
  });

  test("it correctly enforces the policies", async () => {
    await expect(enforcer.enforce("alice", "data2", "read")).resolves.toBe(
      true,
    );
    await expect(enforcer.enforce("bob", "data2", "write")).resolves.toBe(true);
    await expect(enforcer.enforce("bob", "data1", "read")).resolves.toBe(false);
  });

  test("enforcer.getAllSubjects", async () => {
    await expect(enforcer.getAllSubjects()).resolves.toEqual([
      "alice",
      "bob",
      "data2_admin",
    ]);
  });

  test("enforcer.getAllNamedSubjects", async () => {
    await expect(enforcer.getAllNamedSubjects("p")).resolves.toEqual([
      "alice",
      "bob",
      "data2_admin",
    ]);
  });

  test("enforcer.getAllObjects", async () => {
    await expect(enforcer.getAllObjects()).resolves.toEqual(["data1", "data2"]);
  });

  test("enforcer.getAllNamedObjects", async () => {
    await expect(enforcer.getAllNamedObjects("p")).resolves.toEqual([
      "data1",
      "data2",
    ]);
    await expect(enforcer.getAllNamedObjects("g")).resolves.toEqual([]);
  });

  test("enforcer.getAllActions", async () => {
    await expect(enforcer.getAllActions()).resolves.toEqual(["read", "write"]);
  });

  test("enforcer.getAllNamedActions", async () => {
    await expect(enforcer.getAllNamedActions("p")).resolves.toEqual([
      "read",
      "write",
    ]);
  });

  test("enforcer.getAllRoles", async () => {
    await expect(enforcer.getAllRoles()).resolves.toEqual(["data2_admin"]);
  });

  test("enforcer.getAllNamedRoles", async () => {
    await expect(enforcer.getAllNamedRoles("p")).resolves.toEqual([]);
    await expect(enforcer.getAllNamedRoles("g")).resolves.toEqual([
      "data2_admin",
    ]);
  });

  test("enforcer.getPolicy", async () => {
    await expect(enforcer.getPolicy()).resolves.toEqual([
      policies.alice,
      policies.bob,
      policies.data2AdminRead,
      policies.data2AdminWrite,
    ]);
  });

  test("enforcer.getFilteredPolicy", async () => {
    await expect(enforcer.getFilteredPolicy(0, "alice")).resolves.toEqual([
      ["alice", "data1", "read"],
    ]);
  });

  test("enforcer.getNamedPolicy", async () => {
    await expect(enforcer.getNamedPolicy("p")).resolves.toEqual([
      policies.alice,
      policies.bob,
      policies.data2AdminRead,
      policies.data2AdminWrite,
    ]);
  });

  test("enforcer.getFilteredNamedPolicy", async () => {
    await expect(
      enforcer.getFilteredNamedPolicy("p", 0, "bob"),
    ).resolves.toEqual([["bob", "data2", "write"]]);
  });

  test("enforcer.getGroupingPolicy", async () => {
    await expect(enforcer.getGroupingPolicy()).resolves.toEqual([
      ["alice", "data2_admin"],
    ]);
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
    await expect(enforcer.hasPolicy(...policies.bob)).resolves.toEqual(true);

    await expect(
      enforcer.hasPolicy("alice", "data2", "write"),
    ).resolves.toEqual(false);
  });

  test("enforcer.hasNamedPolicy", async () => {
    await expect(
      enforcer.hasNamedPolicy("p", ...policies.alice),
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
      expect(rules).toHaveLength(6);
    });

    test("returns false if the rule already exists", async () => {
      const result = await enforcer.addPolicy(...policies.alice);
      const rules = await CasbinRule.query();

      expect(result).toBe(false);
      expect(rules).toHaveLength(5);
    });
  });

  describe("enforcer.addPolicies", () => {
    test("adds the new policies and saves them if there are no conflicts", async () => {
      const result = await enforcer.addPolicies([
        ["admin", "domain3", "data3", "read"],
        ["admin", "domain3", "data3", "write"],
      ]);
      const rules = await CasbinRule.query();

      expect(result).toBe(true);
      expect(rules).toHaveLength(7);
    });

    test("returns false if any of the policies already exist", async () => {
      const result = await enforcer.addPolicies([
        ["admin", "domain3", "data3", "read"],
        ["admin", "domain3", "data3", "write"],
        policies.alice,
      ]);

      expect(result).toBe(false);
    });

    test("does not persist anything if a policy already exists", async () => {
      await enforcer.addPolicies([
        ["admin", "domain3", "data3", "read"],
        ["admin", "domain3", "data3", "write"],
        policies.alice,
      ]);
      const rules = await CasbinRule.query();

      expect(rules).toHaveLength(5);
    });
  });

  describe("enforcer.addNamedPolicy", () => {
    test("adds the new policy and saves it", async () => {
      const result = await enforcer.addNamedPolicy(
        "p",
        "admin",
        "domain3",
        "data3",
        "read",
      );
      const rules = await CasbinRule.query();

      expect(result).toBe(true);
      expect(rules).toHaveLength(6);
    });

    test("returns false if the rule already exists", async () => {
      const result = await enforcer.addNamedPolicy(
        "p",
        ...policies.data2AdminRead,
      );
      const rules = await CasbinRule.query();

      expect(result).toBe(false);
      expect(rules).toHaveLength(5);
    });
  });

  describe("enforcer.addNamedPolicies", () => {
    test("adds the new policies and saves them if there are no conflicts", async () => {
      const result = await enforcer.addNamedPolicies("p", [
        ["admin", "domain3", "data3", "read"],
        ["admin", "domain3", "data3", "write"],
      ]);
      const rules = await CasbinRule.query();

      expect(result).toBe(true);
      expect(rules).toHaveLength(7);
    });

    test("returns false if any of the policies already exist", async () => {
      const result = await enforcer.addNamedPolicies("p", [
        ["admin", "domain3", "data3", "read"],
        ["admin", "domain3", "data3", "write"],
        policies.bob,
      ]);

      expect(result).toBe(false);
    });

    test("does not persist anything if a policy already exists", async () => {
      await enforcer.addNamedPolicies("p", [
        ["admin", "domain3", "data3", "read"],
        ["admin", "domain3", "data3", "write"],
        policies.data2AdminWrite,
      ]);
      const rules = await CasbinRule.query();

      expect(rules).toHaveLength(5);
    });
  });

  test("enforcer.removePolicy", async () => {
    await expect(enforcer.removePolicy(...policies.bob)).resolves.toEqual(true);

    await expect(enforcer.removePolicy(...policies.bob)).resolves.toEqual(
      false,
    );

    await expect(CasbinRule.query()).resolves.toHaveLength(4);
  });

  test("enforcer.removePolicies", async () => {
    await expect(
      enforcer.removePolicies([policies.alice, policies.bob]),
    ).resolves.toEqual(true);

    await expect(enforcer.removePolicies([policies.alice])).resolves.toEqual(
      false,
    );

    await expect(CasbinRule.query()).resolves.toHaveLength(3);
  });

  test("enforcer.removeFilteredPolicy", async () => {
    const subject = "alice"; // the user that wants to access a resource.
    const resource = "data1"; // the resource that is going to be accessed.
    const action = "read"; // the operation that the user performs on the resource.

    let result = await enforcer.enforce(subject, resource, action);
    let hasPolicy = await enforcer.hasPolicy(subject, resource, action);

    expect(result).toBe(true);
    expect(hasPolicy).toBe(true);

    await enforcer.removeFilteredPolicy(0, subject, resource, action);

    hasPolicy = await enforcer.hasPolicy(subject, resource, action);
    result = await enforcer.enforce(subject, resource, action);

    expect(hasPolicy).toBe(false);
    expect(result).toBe(false);
  });

  test("enforcer.removeFilteredGroupingPolicy", async () => {
    await expect(
      enforcer.removeFilteredGroupingPolicy(0, "alice"),
    ).resolves.toBe(true);

    await enforcer.addGroupingPolicy("group1", "data2_admin");

    await expect(
      enforcer.removeFilteredGroupingPolicy(0, "alice"),
    ).resolves.toBe(false);
  });
});
