import {
  Source,
  Loader,
  DocumentPointerSingle,
  SchemaPointerSingle,
} from '@graphql-toolkit/common';

import {LoadersMissingError, LoaderNoResultError} from './errors';
import {flatten} from './helpers';
import {PointerWithConfiguration} from './types';

function isGlob(pointer: any): pointer is string {
  return typeof pointer === 'string' && pointer.includes('*');
}

function isPointerWithConfiguration(
  pointer: any,
): pointer is PointerWithConfiguration {
  const isObject = typeof pointer === 'object';
  const hasOneKey = Object.keys(pointer).length === 1;
  const key = Object.keys(pointer)[0];
  const hasConfiguration = typeof pointer[key] === 'object';

  return isObject && hasOneKey && hasConfiguration;
}

function isSourceArray(sources: any): sources is Source[] {
  return Array.isArray(sources);
}

export class LoadersRegistry<
  TPointer extends SchemaPointerSingle | DocumentPointerSingle
> {
  private _loaders: Loader<TPointer>[] = [];
  private readonly cwd: string;

  constructor({cwd}: {cwd: string}) {
    this.cwd = cwd;
  }

  register(loader: Loader<TPointer>): void {
    if (!this._loaders.some(l => l.loaderId() === loader.loaderId())) {
      this._loaders.push(loader);
    }
  }

  async load(pointer: TPointer, options?: any): Promise<Source[]> {
    if (!options) {
      options = {};
    }

    options.cwd = this.cwd;

    if (isGlob(pointer)) {
      const {default: globby} = await import('globby');
      const filepaths = await globby(pointer, {
        cwd: this.cwd,
      });
      const results = await Promise.all(
        filepaths.map(filepath => this.load(filepath as any, options)),
      );

      return flatten(results.filter(isSourceArray));
    }

    if (isPointerWithConfiguration(pointer)) {
      const key = Object.keys(pointer)[0];
      return this.load(key as any, (pointer as PointerWithConfiguration)[key]);
    }

    if (this._loaders.length === 0) {
      throw new LoadersMissingError(`Loaders are missing`);
    }

    for (const loader of this._loaders) {
      if (await loader.canLoad(pointer, options)) {
        const result = await loader.load(pointer, options);
        if (result) {
          return [result];
        }
      }
    }

    throw new LoaderNoResultError(
      `None of provided loaders could resolve: ${pointer}`,
    );
  }
}
