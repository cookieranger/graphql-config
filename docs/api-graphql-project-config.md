---
id: graphql-project-config
title: GraphQLProjectConfig
sidebar_label: GraphQLProjectConfig
---

The `GraphQLProjectConfig` represents projects defined in GraphQL Config file.

A basic usage:

```typescript
import {loadConfig} from 'graphql-config';

async function main() {
  const config = await loadConfig({...}); // an instance of GraphQLConfig

  const project = config.getDefault(); // an instance of GraphQLProjectConfig
}
```

## API

### `name`

_type: `string`_

Project's name.

### `filepath`

_type: `string`_

An exact path of a config file.

### `dirpath`

_type: `string`_

A path of a directory where GraphQL Config was found.

### `extensions`

_type: `IExtensions`_

A raw key-value object representing extensions.

### `schema`

_type: `SchemaPointer`_

Value defined in `schema` property, in the config file.

### `documents`

_type: `DocumentPointer`_

Value defined in `documents` property, in the config file.

### `include`

_type: `string | string[]`_

Value defined in `include` property, in the config file.

### `exclude`

_type: `string | string[]`_

Value defined in `exclude` property, in the config file.

### `projects`

_type: `{ [projectName: string]: GraphQLProjectConfig }`_

A key-value object where key is a project's name but value contains [`GraphQLProjectConfig`](./api-graphql-project-config.md) object.

### `hasExtension()`

_type: `hasExtension(name: string): boolean`_

Checks if project contains the extension.

### `getDefault()`

_type: `getDefault(): GraphQLProjectConfig | never`_

Returns a default project.

### `extension()`

_type: `extension<T = any>(name: string): T`_

Allows to access extension's configuration + `schema`, `documents`, `include` and `exclude` values are also added to the object.

### `getSchema()`

_type: `getSchema(): Promise<GraphQLSchema>`_
_type: `getSchema(out: 'DocumentNode'): Promise<DocumentNode>`_
_type: `getSchema(out: 'GraphQLSchema'): Promise<GraphQLSchema>`_

Allows to access `GraphQLSchema` object based on provided information (in `schema` property of project's configuration).

### `getDocuments()`

_type: `getDocuments(): Promise<Source[]>`_

Access Operations and Fragments wrapped with `Source` class based on provided information (in `documents` property of project's configuration).

### `match()`

_type: `match(filepath: string): boolean`_

Checks if file belongs to the project. It considers `schema`, `documents`, `include` and `exclude` options to see if the file path matches one of those values.
