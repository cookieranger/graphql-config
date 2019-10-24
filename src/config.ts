import {dirname} from 'path';
import {IGraphQLConfig, GraphQLCofigResult} from './types';
import {GraphQLProjectConfig} from './project-config';
import {
  isMultipleProjectConfig,
  isSingleProjectConfig,
  findConfig,
  getConfig,
} from './helpers';
import {
  ProjectNotFoundError,
  ConfigNotFoundError,
  ConfigEmptyError,
} from './errors';
import {
  GraphQLExtensionDeclaration,
  GraphQLExtensionsRegistry,
} from './extension';

const cwd = typeof process !== 'undefined' ? process.cwd() : undefined;

interface LoadConfigOptions {
  filepath?: string;
  rootDir?: string;
  extensions?: GraphQLExtensionDeclaration[];
  throwOnMissing?: boolean;
  throwOnEmpty?: boolean;
}

export async function loadConfig({
  filepath,
  rootDir = cwd,
  extensions = [],
  throwOnMissing = true,
  throwOnEmpty = true,
}: LoadConfigOptions) {
  try {
    const found = filepath
      ? await getConfig(filepath)
      : await findConfig(rootDir);

    return new GraphQLConfig(found, extensions);
  } catch (error) {
    if (
      (!throwOnMissing && error instanceof ConfigNotFoundError) ||
      (!throwOnEmpty && error instanceof ConfigEmptyError)
    ) {
      return;
    }

    throw error;
  }
}

export class GraphQLConfig {
  private readonly _rawConfig: IGraphQLConfig;

  readonly filepath: string;
  readonly dirpath: string;

  readonly projects: {
    [name: string]: GraphQLProjectConfig;
  };

  readonly extensions: GraphQLExtensionsRegistry;

  constructor(
    raw: GraphQLCofigResult,
    extensions: GraphQLExtensionDeclaration[],
  ) {
    this._rawConfig = raw.config;
    this.filepath = raw.filepath;
    this.dirpath = dirname(raw.filepath);
    this.extensions = new GraphQLExtensionsRegistry();

    extensions.forEach(extension => {
      this.extensions.register(extension);
    });

    this.projects = {};

    if (isMultipleProjectConfig(this._rawConfig)) {
      for (const projectName in this._rawConfig.projects) {
        const config = this._rawConfig.projects[projectName];

        this.projects[projectName] = new GraphQLProjectConfig({
          filepath: this.filepath,
          name: projectName,
          config,
          extensionsRegistry: this.extensions,
        });
      }
    } else if (isSingleProjectConfig(this._rawConfig)) {
      this.projects['default'] = new GraphQLProjectConfig({
        filepath: this.filepath,
        name: 'default',
        config: this._rawConfig,
        extensionsRegistry: this.extensions,
      });
    }
  }

  getProject(name?: string): GraphQLProjectConfig | never {
    if (!name) {
      return this.getDefault();
    }

    const project = this.projects[name];

    if (!project) {
      throw new ProjectNotFoundError(`Project '${name}' not found`);
    }

    return project;
  }

  getProjectForFile(filepath: string): GraphQLProjectConfig | never {
    // Looks for a project that includes the file or the file is a part of schema or documents
    for (const projectName in this.projects) {
      if (this.projects.hasOwnProperty(projectName)) {
        const project = this.projects[projectName];

        if (project.match(filepath)) {
          return project;
        }
      }
    }

    // The file doesn't match any of the project
    // Looks for a first project that has no `include` and `exclude`
    for (const projectName in this.projects) {
      if (this.projects.hasOwnProperty(projectName)) {
        const project = this.projects[projectName];

        if (!project.include && !project.exclude) {
          return project;
        }
      }
    }

    throw new ProjectNotFoundError(
      `File '${filepath}' doesn't match any project`,
    );
  }

  getDefault(): GraphQLProjectConfig | never {
    return this.getProject('default');
  }
}
