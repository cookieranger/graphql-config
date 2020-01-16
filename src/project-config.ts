import {GraphQLSchema, DocumentNode, parse, print} from 'graphql';
import {dirname, isAbsolute, relative, normalize} from 'path';
import {mergeTypeDefs} from '@graphql-toolkit/schema-merging';
import {Source} from '@graphql-toolkit/common';
import minimatch from 'minimatch';
import {ExtensionMissingError} from './errors';
import {GraphQLExtensionsRegistry} from './extension';
import {IExtensions, IGraphQLProject} from './types';
import {
  UnnormalizedTypeDefPointer,
  OPERATION_KINDS,
} from '@graphql-toolkit/core';

export class GraphQLProjectConfig {
  readonly schema: UnnormalizedTypeDefPointer | UnnormalizedTypeDefPointer[];
  readonly documents?:
    | UnnormalizedTypeDefPointer
    | UnnormalizedTypeDefPointer[];
  readonly include?: string | string[];
  readonly exclude?: string | string[];
  readonly extensions: IExtensions;
  readonly filepath: string;
  readonly dirpath: string;
  readonly name: string;

  private readonly _extensionsRegistry: GraphQLExtensionsRegistry;

  constructor({
    filepath,
    name,
    config,
    extensionsRegistry,
  }: {
    filepath: string;
    name: string;
    config: IGraphQLProject;
    extensionsRegistry: GraphQLExtensionsRegistry;
  }) {
    this.filepath = filepath;
    this.dirpath = dirname(filepath);
    this.name = name;
    this.extensions = config.extensions || {};
    this.schema = config.schema;
    this.documents = config.documents;
    this.include = config.include;
    this.exclude = config.exclude;

    this._extensionsRegistry = extensionsRegistry;
  }

  hasExtension(name: string): boolean {
    return !!this.extensions[name];
  }

  extension<T = any>(name: string): T {
    const extension = this._extensionsRegistry.get(name);

    if (!extension) {
      throw new ExtensionMissingError(
        `Project ${this.name} is missing ${name} extension`,
      );
    }

    return {
      ...this.extensions[name],
      schema: this.schema,
      documents: this.documents,
      include: this.include,
      exclude: this.exclude,
    };
  }

  async getSchema(): Promise<GraphQLSchema>;
  async getSchema(out: 'DocumentNode'): Promise<DocumentNode>;
  async getSchema(out: 'GraphQLSchema'): Promise<GraphQLSchema>;
  async getSchema(out: 'string'): Promise<string>;
  async getSchema(
    out?: 'GraphQLSchema' | 'DocumentNode' | 'string',
  ): Promise<GraphQLSchema | DocumentNode | string> {
    return this.loadSchema(this.schema, out as any);
  }

  async getDocuments(): Promise<Source[]> {
    if (!this.documents) {
      return [];
    }

    return this.loadDocuments(this.documents);
  }

  async loadSchema(
    pointer: UnnormalizedTypeDefPointer | UnnormalizedTypeDefPointer[],
  ): Promise<GraphQLSchema>;
  async loadSchema(
    pointer: UnnormalizedTypeDefPointer | UnnormalizedTypeDefPointer[],
    out: 'string',
  ): Promise<GraphQLSchema>;
  async loadSchema(
    pointer: UnnormalizedTypeDefPointer | UnnormalizedTypeDefPointer[],
    out: 'DocumentNode',
  ): Promise<DocumentNode>;
  async loadSchema(
    pointer: UnnormalizedTypeDefPointer | UnnormalizedTypeDefPointer[],
    out: 'GraphQLSchema',
  ): Promise<GraphQLSchema>;
  async loadSchema(
    pointer: UnnormalizedTypeDefPointer | UnnormalizedTypeDefPointer[],
    out?: 'GraphQLSchema' | 'DocumentNode' | 'string',
  ): Promise<GraphQLSchema | DocumentNode | string> {
    out = out || 'GraphQLSchema';
    if (out === 'GraphQLSchema') {
      return this._extensionsRegistry.loaders.schema.loadSchema(pointer);
    } else {
      const sources = await this._extensionsRegistry.loaders.schema.loadTypeDefs(
        pointer,
        {
          filterKinds: OPERATION_KINDS,
        },
      );
      const mergedTypedefs = mergeTypeDefs(sources.map(s => s.document));
      if (typeof mergedTypedefs === 'string') {
        if (out === 'string') {
          return mergedTypedefs;
        } else if (out === 'DocumentNode') {
          return parse(mergedTypedefs);
        }
      } else if ('kind' in mergedTypedefs) {
        if (out === 'DocumentNode') {
          return mergedTypedefs;
        } else if (out === 'string') {
          return print(mergedTypedefs);
        }
      }
    }
  }

  async loadDocuments(
    pointer: UnnormalizedTypeDefPointer | UnnormalizedTypeDefPointer[],
  ): Promise<Source[]> {
    if (!pointer) {
      return [];
    }

    return this._extensionsRegistry.loaders.documents.loadDocuments(pointer);
  }

  match(filepath: string): boolean {
    const isSchemaOrDocument = [this.schema, this.documents].some(pointer =>
      match(filepath, this.dirpath, pointer),
    );

    if (isSchemaOrDocument) {
      return true;
    }

    const isExcluded = this.exclude
      ? match(filepath, this.dirpath, this.exclude)
      : false;

    if (isExcluded) {
      return false;
    }

    const isIncluded = this.include
      ? match(filepath, this.dirpath, this.include)
      : false;

    if (isIncluded) {
      return true;
    }

    return false;
  }
}

// XXX: it works but uses nodejs - expose normalization of file and dir paths in config
function match(
  filepath: string,
  dirpath: string,
  pointer?: UnnormalizedTypeDefPointer | UnnormalizedTypeDefPointer[],
): boolean {
  if (!pointer) {
    return false;
  }

  if (Array.isArray(pointer)) {
    return pointer.some(p => match(filepath, dirpath, p));
  }

  if (typeof pointer === 'string') {
    const normalizedFilepath = normalize(
      isAbsolute(filepath) ? relative(dirpath, filepath) : filepath,
    );
    return minimatch(normalizedFilepath, normalize(pointer), {dot: true});
  }

  if (typeof pointer === 'object') {
    return match(filepath, dirpath, Object.keys(pointer)[0]);
  }

  return false;
}
