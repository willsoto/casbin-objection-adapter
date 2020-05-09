import * as objection from "objection";

export class CasbinRule extends objection.Model {
  static tableName = "casbin_rules";

  ptype!: string;
  v0!: string;
  v1!: string;
  v2!: string;
  v3!: string;
  v4!: string;
  v5!: string;
}
