import { PartialModelObject } from "objection";
import { CasbinRule } from "./model";

export type Logger = {
  debug: Console["debug"];
  info: Console["info"];
  warn: Console["warn"];
  log: Console["log"];
};

export type Policy = PartialModelObject<CasbinRule>;

export interface ObjectionAdapterOptions {
  /**
   * @default casbin_rules
   */
  tableName?: string;
  /**
   * Whether or not to create the table at startup.
   * @default true
   */
  createTable?: boolean;
  modelClass?: typeof CasbinRule;
  logger?: Logger;
}
