# Casbin Objection Adapter

![tests](https://github.com/willsoto/casbin-objection-adapter/workflows/tests/badge.svg)

<!-- prettier-ignore-start -->

<!-- toc -->

- [Installation](#installation)
- [Basic usage](#basic-usage)
- [Advanced usage](#advanced-usage)

<!-- tocstop -->

<!-- prettier-ignore-end -->

## Installation

```bash
npm install @willsoto/casbin-objection-adapter --save
```

```bash
yarn add @willsoto/casbin-objection-adapter
```

```bash
pnpm add @willsoto/casbin-objection-adapter
```

## Basic usage

See [the Casbin adapters documentation](https://casbin.org/docs/en/adapters) for more information.

```js
import Knex from "knex";
import { newEnforcer } from "casbin";
import { ObjectionAdapter } from "@willsoto/casbin-objection-adapter";

const knex = Knex({
  /* regular knex options */
});

// All configuration is optional
const adapter = await ObjectionAdapter.newAdapter(knex, {});

// Create the enforcer with the given model
const enforcer = await newEnforcer("basic_model.conf", adapter);

// Supports auto-save
// See: https://casbin.org/docs/en/adapters#autosave
enforcer.enableAutoSave(true);

// No need to save explicitly since auto-save is enabled
await enforcer.addPolicies([
  ["alice", "data1", "read"],
  ["bob", "data2", "write"],
]);

await enforcer.enforce("alice", "data1", "read"); // true
await enforcer.enforce("bob", "data1", "read"); // false
```

## Advanced usage

The following options are available:

| Option        | Default value | Description                                                                                                     |
| ------------- | ------------- | --------------------------------------------------------------------------------------------------------------- |
| `createTable` | `true`        | Whether or not to create the table when initialized.                                                            |
| `modelClass`  | `CasbinRule`  | The model to use when querying policies. You can override this if you would like to control the table name      |
| `logger`      | `noop`        | An optional logger in case additional visiblity is needed into the adapter. The inteface should match `console` |
