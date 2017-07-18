import { dirname, resolve } from 'path'

import {
  GraphQLSchema,
  graphql,
  introspectionQuery,
  printSchema,
  buildClientSchema,
} from 'graphql'

import { GraphQLClient } from 'graphql-request'

import {
  GraphQLResolvedConfigData,
  GraphQLConfigData,
  GraphQLConfigExtensions,
  GraphQLConfigEnpointConfig,
  GraphQLConfigEnpointsMap,
} from './types'

import {
  findConfigPath,
  readConfig,
  matchesGlobs,
  validateConfig,
  mergeConfigs,
  readSchema,
} from './utils'

/*
 * this class can be used for simple usecases where there is no need in per-file API
 */
export class GraphQLProjectConfig {
  public config: GraphQLResolvedConfigData
  public configPath: string

  constructor(
    path: string = process.cwd(),
    public projectName: string = process.env.GRAPHQL_PROJECT,
    configData?: GraphQLConfigData // in case the data is already parsed
  ) {
    this.configPath = findConfigPath(path)

    let config = configData
    if (config == null) {
      config = readConfig(this.configPath)
    }
    validateConfig(config)
    this.config = loadProjectConfig(config, projectName)
  }

  resolveConfigPath(relativePath: string): string {
    return resolve(dirname(this.configPath), relativePath)
  }

  includesFile(filePath: string): boolean {
    filePath = resolve(filePath)
    return (
      (!this.config.include || matchesGlobs(filePath, this.include)) &&
      !matchesGlobs(filePath, this.exclude)
    )
  }

  resolveSchema(): Promise<GraphQLSchema> {
    if (this.schemaPath) {
      return readSchema(this.resolveConfigPath(this.schemaPath))
    }
    throw new Error(
      `"schemaPath" is required but not provided in ${this.configPath}`
    )
  }

  resolveIntrospection(): Promise<any> {
    return this.resolveSchema()
      .then(schema => graphql(schema, introspectionQuery))
  }

  resolveSchemaIDL(): Promise<string> {
    return this.resolveSchema()
      .then(schema => printSchema(schema))
  }

  // Getters
  get schemaPath(): string {
    return this.resolveConfigPath(this.config.schemaPath)
  }

  get include(): string[] {
    return (this.config.include || []).map(
      glob => this.resolveConfigPath(glob)
    )
  }

  get exclude(): string[] {
    return (this.config.exclude || []).map(
      glob => this.resolveConfigPath(glob)
    )
  }

  get extensions(): GraphQLConfigExtensions {
    return this.config.extensions || {}
  }

  // helper functions
  getEndpointsMap(): GraphQLConfigEnpointsMap {
    const endpoint = this.extensions.endpoint
    if (endpoint == null) {
      return {}
    } else if (typeof endpoint === 'string') {
      return {
        default: {
          url: endpoint,
        },
      }
    } else if (typeof endpoint !== 'object' || Array.isArray(endpoint)) {
      throw new Error('"endpoint" should be string or object')
    } else if (!endpoint['url']) {
      return endpoint as GraphQLConfigEnpointsMap
    } else if (typeof endpoint['url'] === 'string') {
      return {
        default: endpoint as GraphQLConfigEnpointConfig,
      }
    } else {
      throw new Error('"url" should by a string')
    }
  }

  resolveSchemaFromEndpoint(name: string = 'default'): Promise<GraphQLSchema> {
    const { url, headers } = this.getEndpointsMap()[name]
    if (!url) {
      // TODO
      throw new Error('Undefined endpoint')
    }
    const client = new GraphQLClient(url, { headers })
    return client.request(introspectionQuery)
      .then(introspection => buildClientSchema(introspection))
  }
}

function loadProjectConfig(
  config: GraphQLConfigData,
  projectName: string
) {
  const { projects, ...configBase } = config

  if (projects == null || !Object.keys(projects).length) {
    return config
  }

  if (!projectName) {
    throw new Error('Project name must be specified for multiproject config')
  }

  const projectConfig = projects[projectName]
  if (!projectConfig) {
    throw new Error(`No config for ${projectName}`)
  }

  return mergeConfigs(configBase, projectConfig)
}
