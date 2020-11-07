import { Enforcer, newEnforcer } from "casbin";
import { expect } from "chai";
import Knex from "knex";
import path from "path";
import { CasbinRule, ObjectionAdapter } from "../../src";
import { makeAndConfigureDatabase } from "../utils";

describe("ObjectionAdapter (RBAC)", function () {
  let adapter: ObjectionAdapter;
  let enforcer: Enforcer;
  let knex: Knex;

  const policies = {
    alice: ["alice", "data1", "read"],
    bob: ["bob", "data2", "write"],
    data2AdminRead: ["data2_admin", "data2", "read"],
    data2AdminWrite: ["data2_admin", "data2", "write"],
  };

  before(function () {
    knex = makeAndConfigureDatabase(__dirname);
  });

  beforeEach(async function () {
    adapter = await ObjectionAdapter.newAdapter(knex);

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

  afterEach(async function () {
    await adapter.dropTable();
  });

  after(async function () {
    await knex.destroy();
  });

  it("it correctly enforces the policies", async function () {
    await expect(enforcer.enforce("alice", "data2", "read")).to.eventually.eql(
      true,
    );
    await expect(enforcer.enforce("bob", "data2", "write")).to.eventually.eql(
      true,
    );
    await expect(enforcer.enforce("bob", "data1", "read")).to.eventually.eql(
      false,
    );
  });

  it("enforcer.getAllSubjects", async function () {
    await expect(enforcer.getAllSubjects()).to.eventually.eql([
      "alice",
      "bob",
      "data2_admin",
    ]);
  });

  it("enforcer.getAllNamedSubjects", async function () {
    await expect(enforcer.getAllNamedSubjects("p")).to.eventually.eql([
      "alice",
      "bob",
      "data2_admin",
    ]);
  });

  it("enforcer.getAllObjects", async function () {
    await expect(enforcer.getAllObjects()).to.eventually.eql([
      "data1",
      "data2",
    ]);
  });

  it("enforcer.getAllNamedObjects", async function () {
    await expect(enforcer.getAllNamedObjects("p")).to.eventually.eql([
      "data1",
      "data2",
    ]);
    await expect(enforcer.getAllNamedObjects("g")).to.eventually.eql([]);
  });

  it("enforcer.getAllActions", async function () {
    await expect(enforcer.getAllActions()).to.eventually.eql(["read", "write"]);
  });

  it("enforcer.getAllNamedActions", async function () {
    await expect(enforcer.getAllNamedActions("p")).to.eventually.eql([
      "read",
      "write",
    ]);
  });

  it("enforcer.getAllRoles", async function () {
    await expect(enforcer.getAllRoles()).to.eventually.eql(["data2_admin"]);
  });

  it("enforcer.getAllNamedRoles", async function () {
    await expect(enforcer.getAllNamedRoles("p")).to.eventually.eql([]);
    await expect(enforcer.getAllNamedRoles("g")).to.eventually.eql([
      "data2_admin",
    ]);
  });

  it("enforcer.getPolicy", async function () {
    await expect(enforcer.getPolicy()).to.eventually.eql([
      policies.alice,
      policies.bob,
      policies.data2AdminRead,
      policies.data2AdminWrite,
    ]);
  });

  it("enforcer.getFilteredPolicy", async function () {
    await expect(enforcer.getFilteredPolicy(0, "alice")).to.eventually.eql([
      ["alice", "data1", "read"],
    ]);
  });

  it("enforcer.getNamedPolicy", async function () {
    await expect(enforcer.getNamedPolicy("p")).to.eventually.eql([
      policies.alice,
      policies.bob,
      policies.data2AdminRead,
      policies.data2AdminWrite,
    ]);
  });

  it("enforcer.getFilteredNamedPolicy", async function () {
    await expect(
      enforcer.getFilteredNamedPolicy("p", 0, "bob"),
    ).to.eventually.eql([["bob", "data2", "write"]]);
  });

  it("enforcer.getGroupingPolicy", async function () {
    await expect(enforcer.getGroupingPolicy()).to.eventually.eql([
      ["alice", "data2_admin"],
    ]);
  });

  it("enforcer.getNamedGroupingPolicy", async function () {
    await expect(enforcer.getNamedGroupingPolicy("p")).to.eventually.eql([]);
  });

  it("enforcer.getFilteredNamedGroupingPolicy", async function () {
    await expect(
      enforcer.getFilteredNamedGroupingPolicy("p", 0, "bob"),
    ).to.eventually.eql([]);
  });

  it("enforcer.hasPolicy", async function () {
    await expect(enforcer.hasPolicy(...policies.bob)).to.eventually.eql(true);

    await expect(
      enforcer.hasPolicy("alice", "data2", "write"),
    ).to.eventually.eql(false);
  });

  it("enforcer.hasNamedPolicy", async function () {
    await expect(
      enforcer.hasNamedPolicy("p", ...policies.alice),
    ).to.eventually.eql(true);

    await expect(
      enforcer.hasNamedPolicy("g", "alice", "data1", "read"),
    ).to.eventually.eql(false);
  });

  describe("enforcer.addPolicy", function () {
    it("adds the new policy and saves it", async function () {
      const result = await enforcer.addPolicy("thor", "data1", "write");
      const rules = await CasbinRule.query();

      expect(result).to.eql(true);
      expect(rules).to.have.length(6);
    });

    it("returns false if the rule already exists", async function () {
      const result = await enforcer.addPolicy(...policies.alice);
      const rules = await CasbinRule.query();

      expect(result).to.eql(false);
      expect(rules).to.have.length(5);
    });
  });

  describe("enforcer.addPolicies", function () {
    it("adds the new policies and saves them if there are no conflicts", async function () {
      const result = await enforcer.addPolicies([
        ["admin", "domain3", "data3", "read"],
        ["admin", "domain3", "data3", "write"],
      ]);
      const rules = await CasbinRule.query();

      expect(result).to.eql(true);
      expect(rules).to.have.length(7);
    });

    it("returns false if any of the policies already exist", async function () {
      const result = await enforcer.addPolicies([
        ["admin", "domain3", "data3", "read"],
        ["admin", "domain3", "data3", "write"],
        policies.alice,
      ]);

      expect(result).to.eql(false);
    });

    it("does not persist anything if a policy already exists", async function () {
      await enforcer.addPolicies([
        ["admin", "domain3", "data3", "read"],
        ["admin", "domain3", "data3", "write"],
        policies.alice,
      ]);
      const rules = await CasbinRule.query();

      expect(rules).to.have.length(5);
    });
  });

  describe("enforcer.addNamedPolicy", function () {
    it("adds the new policy and saves it", async function () {
      const result = await enforcer.addNamedPolicy(
        "p",
        "admin",
        "domain3",
        "data3",
        "read",
      );
      const rules = await CasbinRule.query();

      expect(result).to.eql(true);
      expect(rules).to.have.length(6);
    });

    it("returns false if the rule already exists", async function () {
      const result = await enforcer.addNamedPolicy(
        "p",
        ...policies.data2AdminRead,
      );
      const rules = await CasbinRule.query();

      expect(result).to.eql(false);
      expect(rules).to.have.length(5);
    });
  });

  describe("enforcer.addNamedPolicies", function () {
    it("adds the new policies and saves them if there are no conflicts", async function () {
      const result = await enforcer.addNamedPolicies("p", [
        ["admin", "domain3", "data3", "read"],
        ["admin", "domain3", "data3", "write"],
      ]);
      const rules = await CasbinRule.query();

      expect(result).to.eql(true);
      expect(rules).to.have.length(7);
    });

    it("returns false if any of the policies already exist", async function () {
      const result = await enforcer.addNamedPolicies("p", [
        ["admin", "domain3", "data3", "read"],
        ["admin", "domain3", "data3", "write"],
        policies.bob,
      ]);

      expect(result).to.eql(false);
    });

    it("does not persist anything if a policy already exists", async function () {
      await enforcer.addNamedPolicies("p", [
        ["admin", "domain3", "data3", "read"],
        ["admin", "domain3", "data3", "write"],
        policies.data2AdminWrite,
      ]);
      const rules = await CasbinRule.query();

      expect(rules).to.have.length(5);
    });
  });

  it("enforcer.removePolicy", async function () {
    await expect(enforcer.removePolicy(...policies.bob)).to.eventually.eql(
      true,
    );

    await expect(enforcer.removePolicy(...policies.bob)).to.eventually.eql(
      false,
    );

    await expect(CasbinRule.query()).to.eventually.have.length(4);
  });

  it("enforcer.removePolicies", async function () {
    await expect(
      enforcer.removePolicies([policies.alice, policies.bob]),
    ).to.eventually.eql(true);

    await expect(enforcer.removePolicies([policies.alice])).to.eventually.eql(
      false,
    );

    await expect(CasbinRule.query()).to.eventually.have.length(3);
  });

  it("enforcer.removeFilteredPolicy", async function () {
    const subject = "alice"; // the user that wants to access a resource.
    const resource = "data1"; // the resource that is going to be accessed.
    const action = "read"; // the operation that the user performs on the resource.

    let result = await enforcer.enforce(subject, resource, action);
    let hasPolicy = await enforcer.hasPolicy(subject, resource, action);

    expect(result).to.eql(true);
    expect(hasPolicy).to.eql(true);

    await enforcer.removeFilteredPolicy(0, subject, resource, action);

    hasPolicy = await enforcer.hasPolicy(subject, resource, action);
    result = await enforcer.enforce(subject, resource, action);

    expect(hasPolicy).to.eql(false);
    expect(result).to.eql(false);
  });

  it("enforcer.removeFilteredGroupingPolicy", async function () {
    await expect(
      enforcer.removeFilteredGroupingPolicy(0, "alice"),
    ).to.eventually.eql(true);

    await enforcer.addGroupingPolicy("group1", "data2_admin");

    await expect(
      enforcer.removeFilteredGroupingPolicy(0, "alice"),
    ).to.eventually.eql(false);
  });
});
