import { PartialModelObject } from "objection";
import { CasbinRule } from "./model";

export type Logger = {
  debug: Console["debug"];
  info: Console["info"];
  warn: Console["warn"];
  log: Console["log"];
};

export type Policy = PartialModelObject<CasbinRule>;

/**
 * The options for the adapter. All values are optional.
 */
export interface ObjectionAdapterOptions {
  /**
   * Whether or not to create the table at startup. If deferring table creation, you can call
   * `adapter.createTable()` yourself, or manually create and run a migration.
   *
   * Be sure you abide by the {@link https://github.com/casbin/xorm-adapter/blob/79a2aa54a016320eb29cf90090f642183827750b/adapter.go#L28-L36|reference implementation.}
   * @default true
   */
  createTable?: boolean;
  /**
   * @see {@link CasbinRule} for the default implementation.
   *
   * The model will automatically be wired up to the provided Knex instance.
   *
   * @default CasbinRule
   */
  modelClass?: typeof CasbinRule;
  /**
   * The logger to help debug or just have visibility into the adapter.
   * By default, nothing will be logged.
   */
  logger?: Logger;
}
