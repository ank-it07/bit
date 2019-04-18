/** @flow */
import path from 'path';
import R from 'ramda';
import * as RA from 'ramda-adjunct';
import fs from 'fs-extra';
import { BitIds, BitId } from '../../bit-id';
import { filterObject } from '../../utils';
import type { ExtensionOptions } from '../../extensions/extension';
import type { EnvExtensionOptions, EnvType } from '../../extensions/env-extension';
import type { PathOsBased, PathLinux } from '../../utils/path';
import {
  BIT_JSON,
  NO_PLUGIN_TYPE,
  COMPILER_ENV_TYPE,
  DEFAULT_LANGUAGE,
  DEFAULT_BINDINGS_PREFIX,
  DEFAULT_EXTENSIONS,
  PACKAGE_JSON
} from '../../constants';
import logger from '../../logger/logger';
import JSONFile from '../component/sources/json-file';

export type RegularExtensionObject = {
  rawConfig: Object,
  options: ExtensionOptions
};

export type EnvFile = {
  [string]: PathLinux
};

export type EnvExtensionObject = {
  rawConfig: Object,
  options: EnvExtensionOptions,
  files: string[]
};

export type TesterExtensionObject = EnvExtensionObject;

export type CompilerExtensionObject = EnvExtensionObject;

export type Extensions = { [extensionName: string]: RegularExtensionObject };
export type Envs = { [envName: string]: EnvExtensionObject };
export type Compilers = { [compilerName: string]: CompilerExtensionObject };
export type Testers = { [testerName: string]: TesterExtensionObject };

export type AbstractBitConfigProps = {
  compiler?: string | Compilers,
  tester?: string | Testers,
  dependencies?: Object,
  devDependencies?: Object,
  compilerDependencies?: Object,
  testerDependencies?: Object,
  lang?: string,
  bindingPrefix?: string,
  extensions?: Extensions
};

/**
 * There are two Bit Config: ConsumerBitConfig and ComponentBitConfig, both inherit this class.
 * The config data can be written in package.json inside "bit" property. And, can be written in
 * bit.json file. Also, it might be written in both, in which case, if there is any conflict, the
 * bit.json wins.
 */
export default class AbstractBitConfig {
  path: string;
  _compiler: Compilers | string;
  _tester: Testers | string;
  dependencies: { [string]: string };
  devDependencies: { [string]: string };
  compilerDependencies: { [string]: string };
  testerDependencies: { [string]: string };
  lang: string;
  bindingPrefix: string;
  extensions: Extensions;
  writeToPackageJson = false;
  writeToBitJson = false;

  constructor(props: AbstractBitConfigProps) {
    this._compiler = props.compiler || {};
    this._tester = props.tester || {};
    this.lang = props.lang || DEFAULT_LANGUAGE;
    this.bindingPrefix = props.bindingPrefix || DEFAULT_BINDINGS_PREFIX;
    this.extensions = props.extensions || DEFAULT_EXTENSIONS;
  }

  get compiler(): ?Compilers {
    const compilerObj = AbstractBitConfig.transformEnvToObject(this._compiler);
    if (R.isEmpty(compilerObj)) return undefined;
    return compilerObj;
  }

  set compiler(compiler: string | Compilers) {
    this._compiler = AbstractBitConfig.transformEnvToObject(compiler);
  }

  get tester(): ?Testers {
    const testerObj = AbstractBitConfig.transformEnvToObject(this._tester);
    if (R.isEmpty(testerObj)) return undefined;
    return testerObj;
  }

  set tester(tester: string | Testers) {
    this._tester = AbstractBitConfig.transformEnvToObject(tester);
  }

  addDependencies(bitIds: BitId[]): this {
    const idObjects = R.mergeAll(bitIds.map(bitId => bitId.toObject()));
    this.dependencies = R.merge(this.dependencies, idObjects);
    return this;
  }

  addDependency(bitId: BitId): this {
    this.dependencies = R.merge(this.dependencies, bitId.toObject());
    return this;
  }

  hasCompiler(): boolean {
    return !!this.compiler && this._compiler !== NO_PLUGIN_TYPE && !R.isEmpty(this.compiler);
  }

  hasTester(): boolean {
    return !!this.tester && this._tester !== NO_PLUGIN_TYPE && !R.isEmpty(this.tester);
  }

  getEnvsByType(type: EnvType): ?Compilers | ?Testers {
    if (type === COMPILER_ENV_TYPE) {
      return this.compiler;
    }
    return this.tester;
  }

  /**
   * if there is only one env (compiler/tester) and it doesn't have any special configuration, only
   * the name, convert it to a string.
   */
  static convertEnvToStringIfPossible(envObj: ?Envs): ?string | ?Envs {
    if (!envObj) return undefined;
    if (Object.keys(envObj).length !== 1) return envObj; // it has more than one id
    const envId = Object.keys(envObj)[0];
    if (
      RA.isNilOrEmpty(envObj[envId].rawConfig) &&
      RA.isNilOrEmpty(envObj[envId].options) &&
      RA.isNilOrEmpty(envObj[envId].files)
    ) {
      return envId;
    }
    return envObj;
  }

  getDependencies(): BitIds {
    return BitIds.fromObject(this.dependencies);
  }

  toPlainObject(): Object {
    const isPropDefaultOrNull = (val, key) => {
      if (!val) return false;
      if (key === 'lang') return val !== DEFAULT_LANGUAGE;
      if (key === 'bindingPrefix') return val !== DEFAULT_BINDINGS_PREFIX;
      if (key === 'extensions') return !R.equals(val, DEFAULT_EXTENSIONS);
      return true;
    };

    return filterObject(
      {
        lang: this.lang,
        bindingPrefix: this.bindingPrefix,
        env: {
          compiler: AbstractBitConfig.convertEnvToStringIfPossible(this.compiler),
          tester: AbstractBitConfig.convertEnvToStringIfPossible(this.tester)
        },
        dependencies: this.dependencies,
        extensions: this.extensions
      },
      isPropDefaultOrNull
    );
  }

  async write({ bitDir }: { bitDir: string }): Promise<string[]> {
    const jsonFiles = await this.prepareToWrite({ bitDir });
    return Promise.all(jsonFiles.map(jsonFile => jsonFile.write()));
  }

  async prepareToWrite({ bitDir }: { bitDir: string }): Promise<JSONFile[]> {
    const plainObject = this.toPlainObject();
    const JsonFiles = [];
    const addJsonFile = (pathStr: string, content: Object) => {
      const params = { base: bitDir, override: true, path: pathStr, content };
      JsonFiles.push(JSONFile.load(params));
    };
    if (this.writeToPackageJson) {
      const packageJsonPath = AbstractBitConfig.composePackageJsonPath(bitDir);
      const packageJsonFile = await fs.readJson(packageJsonPath);
      packageJsonFile.bit = plainObject;
      addJsonFile(packageJsonPath, packageJsonFile);
    }
    if (this.writeToBitJson) {
      const bitJsonPath = AbstractBitConfig.composeBitJsonPath(bitDir);
      addJsonFile(bitJsonPath, plainObject);
    }
    return JsonFiles;
  }

  toJson(readable: boolean = true) {
    if (!readable) return JSON.stringify(this.toPlainObject());
    return JSON.stringify(this.toPlainObject(), null, 4);
  }

  static composeBitJsonPath(bitPath: PathOsBased): PathOsBased {
    return path.join(bitPath, BIT_JSON);
  }
  static composePackageJsonPath(bitPath: PathOsBased): PathOsBased {
    return path.join(bitPath, PACKAGE_JSON);
  }

  static async pathHasBitJson(bitPath: string): Promise<boolean> {
    return fs.exists(this.composeBitJsonPath(bitPath));
  }
  static async pathHasPackageJson(bitPath: string): Promise<boolean> {
    return fs.exists(this.composePackageJsonPath(bitPath));
  }

  static async loadJsonFileIfExist(jsonFilePath: string): Promise<?Object> {
    try {
      const file = await fs.readJson(jsonFilePath);
      return file;
    } catch (e) {
      if (e.code === 'ENOENT') return null;
      throw e;
    }
  }

  static async removeIfExist(bitPath: string): Promise<boolean> {
    const dirToRemove = this.composeBitJsonPath(bitPath);
    if (fs.exists(dirToRemove)) {
      logger.info(`abstract-bit-config, deleting ${dirToRemove}`);
      return fs.remove(dirToRemove);
    }
    return false;
  }

  static transformEnvToObject(env: string | Object): Envs {
    if (typeof env === 'string') {
      if (env === NO_PLUGIN_TYPE) return {};
      return {
        [env]: {}
      };
    }
    return env;
  }
}
