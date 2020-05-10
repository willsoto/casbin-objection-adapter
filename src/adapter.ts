/* eslint-disable @typescript-eslint/no-empty-function */
import { Adapter, Helper, Model } from "casbin";
import * as Knex from "knex";
import { CasbinRule } from "./model";
import { Logger, ObjectionAdapterOptions, Policy } from "./types";

/**
 * Reference implementation:
 * @see https://github.com/casbin/xorm-adapter/blob/master/adapter.go
 */
export class ObjectionAdapter implements Adapter {
  constructor(
    private knex: Knex,
    private options: Required<ObjectionAdapterOptions>,
  ) {
    this.logger.debug("Adapter created with options %O", options);
  }

  static async newAdapter(
    knex: Knex,
    options: ObjectionAdapterOptions = {},
  ): Promise<ObjectionAdapter> {
    const modelClass = options.modelClass ?? CasbinRule;
    modelClass.knex(knex);

    const opts = {
      tableName: modelClass.tableName,
      createTable: true,
      modelClass,
      logger: {
        debug() {},
        info() {},
        warn() {},
        log() {},
      },
      ...options,
    };

    const adapter = new ObjectionAdapter(knex, opts);

    if (opts.createTable) {
      await adapter.createTable();
    }

    return adapter;
  }

  /**
   * Reference implementation:
   * @see https://github.com/casbin/xorm-adapter/blob/79a2aa54a016320eb29cf90090f642183827750b/adapter.go#L28-L36
   */
  async createTable(): Promise<void> {
    const hasTable = await this.knex.schema.hasTable(this.tableName);

    if (!hasTable) {
      this.logger.log("Creating table", this.tableName);

      await this.knex.schema.createTable(this.tableName, (table) => {
        // The reference implementation does not have a primary key, but you need one when working with Objection/Knex
        table.increments("id").primary().notNullable();
        table.text("ptype").index().notNullable().defaultTo("");
        table.text("v0").index().notNullable().defaultTo("");
        table.text("v1").index().notNullable().defaultTo("");
        table.text("v2").index().notNullable().defaultTo("");
        table.text("v3").index().notNullable().defaultTo("");
        table.text("v4").index().notNullable().defaultTo("");
        table.text("v5").index().notNullable().defaultTo("");
      });
    }
  }

  async dropTable(): Promise<void> {
    this.logger.log("Dropping table", this.tableName);

    await this.knex.schema.dropTableIfExists(this.tableName);
  }

  async loadPolicy(model: Model): Promise<void> {
    this.logger.log("Loading policy");

    const policies = await this.modelClass.query();

    this.logger.log("Found policies %O", policies);

    for (const policy of policies) {
      this.loadPolicyLine(policy, model);
    }
  }

  /**
   * Reference implementation:
   * @see https://github.com/casbin/xorm-adapter/blob/79a2aa54a016320eb29cf90090f642183827750b/adapter.go#L251-L279
   */
  async savePolicy(model: Model): Promise<boolean> {
    this.logger.log("Saving policy", model);

    await this.dropTable();
    await this.createTable();

    const policies: Policy[] = [];

    const p = model.model.get("p") ?? new Map();
    const g = model.model.get("g") ?? new Map();

    for (const [ptype, ast] of p) {
      for (const rule of ast.policy) {
        this.logger.log("Saving policy", ptype, rule);
        policies.push(this.makePolicy(ptype, rule));
      }
    }

    for (const [ptype, ast] of g) {
      for (const rule of ast.policy) {
        this.logger.log("Saving policy", ptype, rule);
        policies.push(this.makePolicy(ptype, rule));
      }
    }
    try {
      // sqlite does not support batch insert
      if (this.knex.client.config.client === "sqlite3") {
        await Promise.all(
          policies.map((policy) => {
            return this.modelClass.query().insert(policy);
          }),
        );
      } else {
        await this.modelClass.query().insert(policies);
      }

      return true;
    } catch (error) {
      this.logger.warn(error);
      return false;
    }
  }

  async addPolicy(sec: string, ptype: string, rule: string[]): Promise<void> {
    const policy = this.makePolicy(ptype, rule);

    this.logger.log("Adding policy %O", policy);

    await this.modelClass.query().insert(policy);
  }

  async addPolicies(
    sec: string,
    ptype: string,
    rules: string[][],
  ): Promise<void> {
    await Promise.all(
      rules.map((rule) => {
        return this.addPolicy(sec, ptype, rule);
      }),
    );
  }

  async removePolicy(
    sec: string,
    ptype: string,
    rule: string[],
  ): Promise<void> {
    const policy = this.makePolicy(ptype, rule);

    this.logger.log("Removing policy %O", policy);

    await this.modelClass.query().delete().skipUndefined().where(policy);
  }

  async removePolicies(
    sec: string,
    ptype: string,
    rules: string[][],
  ): Promise<void> {
    await Promise.all(
      rules.map((rule) => {
        return this.removePolicy(sec, ptype, rule);
      }),
    );
  }

  async removeFilteredPolicy(
    sec: string,
    ptype: string,
    fieldIndex: number,
    ...fieldValues: string[]
  ): Promise<void> {
    const policy: Policy = {
      ptype,
    };

    const index = fieldIndex + fieldValues.length;

    if (fieldIndex <= 0 && index > 0) {
      policy.v0 = fieldValues[0 - fieldIndex];
    }

    if (fieldIndex <= 1 && index > 1) {
      policy.v1 = fieldValues[1 - fieldIndex];
    }

    if (fieldIndex <= 2 && index > 2) {
      policy.v2 = fieldValues[2 - fieldIndex];
    }

    if (fieldIndex <= 3 && index > 3) {
      policy.v3 = fieldValues[3 - fieldIndex];
    }

    if (fieldIndex <= 4 && index > 4) {
      policy.v4 = fieldValues[4 - fieldIndex];
    }

    if (fieldIndex <= 5 && index > 5) {
      policy.v5 = fieldValues[5 - fieldIndex];
    }

    this.logger.log("Removing policy %O", policy);

    await this.modelClass.query().delete().where(policy);
  }

  private makePolicy(ptype: string, rule: string[]): Policy {
    return {
      ptype,
      v0: rule[0],
      v1: rule[1],
      v2: rule[2],
      v3: rule[3],
      v4: rule[4],
      v5: rule[5],
    };
  }

  /**
   * Reference implementation:
   * @see https://github.com/casbin/xorm-adapter/blob/79a2aa54a016320eb29cf90090f642183827750b/adapter.go#L177-L208
   */
  private loadPolicyLine(policy: CasbinRule, model: Model): void {
    this.logger.log("Loading policy: %O", policy);

    const prefix = ", ";
    const policyLine: string[] = [];

    policyLine.push(policy.ptype);

    if (policy.v0.length > 0) {
      policyLine.push(policy.v0);
    }

    if (policy.v1.length > 0) {
      policyLine.push(policy.v1);
    }

    if (policy.v2.length > 0) {
      policyLine.push(policy.v2);
    }

    if (policy.v3.length > 0) {
      policyLine.push(policy.v3);
    }

    if (policy.v4.length > 0) {
      policyLine.push(policy.v4);
    }

    if (policy.v5.length > 0) {
      policyLine.push(policy.v5);
    }

    Helper.loadPolicyLine(policyLine.join(prefix), model);
  }

  private get modelClass(): typeof CasbinRule {
    return this.options.modelClass;
  }

  private get tableName(): string {
    return this.modelClass.tableName;
  }

  private get logger(): Logger {
    return this.options.logger;
  }
}
