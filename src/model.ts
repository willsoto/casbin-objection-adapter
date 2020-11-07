import objection from "objection";

/**
 * CasbinRule represents a single rule/policy.
 *
 * If no custom model is provided, this is the model that will be used to query rules.
 * Users are free to extend this model as needed for their use case.
 *
 * In order to change the table name, provide your own model or extend this one
 * and set the `tableName`.
 *
 * Reference implementation:
 * @see https://github.com/casbin/xorm-adapter/blob/79a2aa54a016320eb29cf90090f642183827750b/adapter.go#L28-L36
 */
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
