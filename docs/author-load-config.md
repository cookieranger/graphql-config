---
id: load-config
title: Loading Config
sidebar_label: Loading Config
---

## loadConfig

This function is the starting point for using GraphQL Config. It looks for a config file in [predefined search places](./user-usage.md#config-search-places) in the currently working directory.

A basic usage example:

```typescript
import {loadConfig} from 'graphql-config';

async function main() {
  const config = await loadConfig({...}); // an instance of GraphQLConfig
}
```

## Options

### `filepath`

_type: `string`_

An exact path of a config file.

### `rootDir`

_type: `string`_

A path of a directory where GraphQL Config should look for a file _(uses process.cwd() by default)_.

### `configName`

_type: `string`_

A name of the config file. It's `graphql` by default. Using `relay` as a config name instructs GraphQL Config to look for all the variations of possible config file names where one of them is `relay.config.js`.

### `extensions`

_type: `GraphQLExtensionDeclaration[]`_

An array of `GraphQLExtensionDeclaration` objects, place to register extensions.

### `throwOnMissing`

_type: `boolean`_

GraphQL Config throws an error where there's no config file by default.

### `throwOnEmpty`

_type: `boolean`_

GraphQL Config by default throws an error if there's a config file but the file is empty.
