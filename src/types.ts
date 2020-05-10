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
   * Whether or not to create the table at startup.
   * @default true
   */
  createTable?: boolean;
  /**
   * @see {@link CasbinRule} for the default implementation
   *
   * When providing a custom model, ensure that it has already been connected to `knex`
   * prior to passing it to the adapter.
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
