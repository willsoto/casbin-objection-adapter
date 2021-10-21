import { Enforcer, newEnforcer } from "casbin";
import { expect } from "chai";
import { Knex } from "knex";
import path from "path";
import { CasbinRule, ObjectionAdapter } from "../../src";
import { makeAndConfigureDatabase } from "../utils";

describe("ObjectionAdapter (ACL)", function () {
  let adapter: ObjectionAdapter;
  let enforcer: Enforcer;
  let knex: Knex;

  const policies = {
    alice: ["alice", "data1", "read"],
    bob: ["bob", "data2", "write"],
    stark: ["tony", "data3", "root"],
  };

  before(function () {
    knex = makeAndConfigureDatabase(__dirname);
  });

  beforeEach(async function () {
    adapter = await ObjectionAdapter.newAdapter(knex);

    enforcer = await newEnforcer(
      path.join(__dirname, "basic_with_root_model.conf"),
      adapter,
    );
    enforcer.enableAutoSave(true);

    await enforcer.addPolicies([policies.alice, policies.bob, policies.stark]);
  });

  afterEach(async function () {
    await adapter.dropTable();
  });

  after(async function () {
    await knex.destroy();
  });

  it("it correctly enforces the policies", async function () {
    await expect(enforcer.enforce("alice", "data1", "read")).to.eventually.eql(
      true,
    );
    await expect(enforcer.enforce("bob", "data1", "read")).to.eventually.eql(
      false,
    );
    await expect(enforcer.enforce("tony", "data1", "root")).to.eventually.eql(
      false,
    );
    await expect(enforcer.enforce("tony", "data3", "root")).to.eventually.eql(
      true,
    );
  });

  it("enforcer.getAllSubjects", async function () {
    await expect(enforcer.getAllSubjects()).to.eventually.eql([
      "alice",
      "bob",
      "tony",
    ]);
  });

  it("enforcer.getAllNamedSubjects", async function () {
    await expect(enforcer.getAllNamedSubjects("p")).to.eventually.eql([
      "alice",
      "bob",
      "tony",
    ]);
  });

  it("enforcer.getAllObjects", async function () {
    await expect(enforcer.getAllObjects()).to.eventually.eql([
      "data1",
      "data2",
      "data3",
    ]);
  });

  it("enforcer.getAllNamedObjects", async function () {
    await expect(enforcer.getAllNamedObjects("p")).to.eventually.eql([
      "data1",
      "data2",
      "data3",
    ]);
  });

  it("enforcer.getAllActions", async function () {
    await expect(enforcer.getAllActions()).to.eventually.eql([
      "read",
      "write",
      "root",
    ]);
  });

  it("enforcer.getAllNamedActions", async function () {
    await expect(enforcer.getAllNamedActions("p")).to.eventually.eql([
      "read",
      "write",
      "root",
    ]);
  });

  it("enforcer.getAllRoles", async function () {
    await expect(enforcer.getAllRoles()).to.eventually.eql([]);
  });

  it("enforcer.getAllNamedRoles", async function () {
    await expect(enforcer.getAllNamedRoles("p")).to.eventually.eql([]);
  });

  it("enforcer.getPolicy", async function () {
    await expect(enforcer.getPolicy()).to.eventually.eql([
      policies.alice,
      policies.bob,
      policies.stark,
    ]);
  });

  it("enforcer.getFilteredPolicy", async function () {
    await expect(enforcer.getFilteredPolicy(0, "alice")).to.eventually.eql([
      policies.alice,
    ]);
  });

  it("enforcer.getNamedPolicy", async function () {
    await expect(enforcer.getNamedPolicy("p")).to.eventually.eql([
      policies.alice,
      policies.bob,
      policies.stark,
    ]);
  });

  it("enforcer.getFilteredNamedPolicy", async function () {
    await expect(
      enforcer.getFilteredNamedPolicy("p", 0, "bob"),
    ).to.eventually.eql([policies.bob]);
  });

  it("enforcer.getGroupingPolicy", async function () {
    await expect(enforcer.getGroupingPolicy()).to.eventually.eql([]);
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
    await expect(
      enforcer.hasPolicy("alice", "data1", "read"),
    ).to.eventually.eql(true);

    await expect(
      enforcer.hasPolicy("alice", "data2", "write"),
    ).to.eventually.eql(false);
  });

  it("enforcer.hasNamedPolicy", async function () {
    await expect(
      enforcer.hasNamedPolicy("p", "alice", "data1", "read"),
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
      expect(rules).to.have.length(4);
    });

    it("returns false if the rule already exists", async function () {
      const result = await enforcer.addPolicy(...policies.alice);
      const rules = await CasbinRule.query();

      expect(result).to.eql(false);
      expect(rules).to.have.length(3);
    });
  });

  describe("enforcer.addPolicies", function () {
    it("adds the new policies and saves them if there are no conflicts", async function () {
      const result = await enforcer.addPolicies([
        ["thor", "data1", "write"],
        ["cap", "data3", "read"],
      ]);
      const rules = await CasbinRule.query();

      expect(result).to.eql(true);
      expect(rules).to.have.length(5);
    });

    it("returns false if any of the policies already exist", async function () {
      const result = await enforcer.addPolicies([
        ["thor", "data1", "write"],
        ["cap", "data3", "read"],
        policies.alice,
      ]);

      expect(result).to.eql(false);
    });

    it("does not persist anything if a policy already exists", async function () {
      await enforcer.addPolicies([
        ["thor", "data1", "write"],
        ["cap", "data3", "read"],
        policies.alice,
      ]);
      const rules = await CasbinRule.query();

      expect(rules).to.have.length(3);
    });
  });

  describe("enforcer.addNamedPolicy", function () {
    it("adds the new policy and saves it", async function () {
      const result = await enforcer.addNamedPolicy(
        "p",
        "thor",
        "data1",
        "write",
      );
      const rules = await CasbinRule.query();

      expect(result).to.eql(true);
      expect(rules).to.have.length(4);
    });

    it("returns false if the rule already exists", async function () {
      const result = await enforcer.addNamedPolicy("p", ...policies.alice);
      const rules = await CasbinRule.query();

      expect(result).to.eql(false);
      expect(rules).to.have.length(3);
    });
  });

  describe("enforcer.addNamedPolicies", function () {
    it("adds the new policies and saves them if there are no conflicts", async function () {
      const result = await enforcer.addNamedPolicies("p", [
        ["thor", "data1", "write"],
        ["cap", "data3", "read"],
      ]);
      const rules = await CasbinRule.query();

      expect(result).to.eql(true);
      expect(rules).to.have.length(5);
    });

    it("returns false if any of the policies already exist", async function () {
      const result = await enforcer.addNamedPolicies("p", [
        ["thor", "data1", "write"],
        ["cap", "data3", "read"],
        policies.alice,
      ]);

      expect(result).to.eql(false);
    });

    it("does not persist anything if a policy already exists", async function () {
      await enforcer.addNamedPolicies("p", [
        ["thor", "data1", "write"],
        ["cap", "data3", "read"],
        policies.alice,
      ]);
      const rules = await CasbinRule.query();

      expect(rules).to.have.length(3);
    });
  });

  it("enforcer.removePolicy", async function () {
    await expect(enforcer.removePolicy(...policies.alice)).to.eventually.eql(
      true,
    );

    await expect(
      enforcer.removePolicy("alice", "data2", "write"),
    ).to.eventually.eql(false);

    await expect(CasbinRule.query()).to.eventually.have.length(2);
  });

  it("enforcer.removePolicies", async function () {
    await expect(
      enforcer.removePolicies([policies.alice, policies.bob]),
    ).to.eventually.eql(true);

    await expect(
      enforcer.removePolicies([["alice", "data2", "write"]]),
    ).to.eventually.eql(false);

    await expect(CasbinRule.query()).to.eventually.have.length(1);
  });

  it("enforcer.removeFilteredPolicy", async function () {
    const subject = "alice"; // the user that wants to access a resource.
    const resource = "data1"; // the resource that is going to be accessed.
    const action = "read"; // the operation that the user performs on the resource.

    let result = await enforcer.enforce(subject, resource, action);
    let hasPolicy = await enforcer.hasPolicy(subject, resource, action);

    expect(hasPolicy).to.eql(true);
    expect(result).to.eql(true);

    await enforcer.removeFilteredPolicy(0, subject, resource, action);

    hasPolicy = await enforcer.hasPolicy(subject, resource, action);
    result = await enforcer.enforce(subject, resource, action);

    expect(hasPolicy).to.eql(false);
    expect(result).to.eql(false);
  });

  it("enforcer.removeNamedPolicy", async function () {
    await expect(
      enforcer.removeNamedPolicy("p", ...policies.alice),
    ).to.eventually.eql(true);
    await expect(
      enforcer.removeNamedPolicy("p", "thor", "data", "write"),
    ).to.eventually.eql(false);
  });

  it("enforcer.removeNamedPolicies", async function () {
    await expect(
      enforcer.removeNamedPolicies("p", [policies.alice, policies.bob]),
    ).to.eventually.eql(true);

    await expect(CasbinRule.query()).to.eventually.have.length(1);

    await expect(
      enforcer.removeNamedPolicies("p", [["thor", "data", "write"]]),
    ).to.eventually.eql(false);
  });

  it("enforcer.removeFilteredNamedPolicy", async function () {
    await expect(
      enforcer.removeFilteredNamedPolicy("p", 0, ...policies.alice),
    ).to.eventually.eql(true);
  });
});
