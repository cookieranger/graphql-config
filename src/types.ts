import {DocumentPointer, SchemaPointer} from '@graphql-toolkit/common';

export type PointerWithConfiguration<T = any> = {[key: string]: T};

export interface IExtensions {
  [name: string]: any;
}

export interface IGraphQLProjects {
  projects: Record<string, IGraphQLProject>;
}

export type IGraphQLConfig = IGraphQLProject | IGraphQLProjects;

export interface IGraphQLProject {
  schema: SchemaPointer;
  documents?: DocumentPointer;
  extensions?: IExtensions;
}

export interface GraphQLCofigResult {
  config: IGraphQLConfig;
  filepath: string;
}

// Kamil: somehow our build process doesn't emit `types.d.ts` file, this should force it...
export function ɵ() {}
