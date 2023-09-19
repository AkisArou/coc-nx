import { extensions, workspace } from 'coc.nvim';
import path, { dirname, join } from 'path';
import { stat, readFile } from 'fs/promises';
import { cwd } from 'process';
import { readFileSync } from 'fs';

const TSCONFIG_BASE = 'tsconfig.base.json';
const TSCONFIG_LIB = 'tsconfig.lib.json';
const typeScriptExtensionId = 'coc-tsserver';

function logCocInfo(...vals: any[]) {
  console.log(`NX-Coc: `, ...vals);
}

type ScopeTagMapping = {
  scopeTag: string | undefined;
  path: TSConfigPath;
};

type TSConfigPath = {
  libName: string;
  indexPath: string;
};

let tagMappings: ScopeTagMapping[];

async function makeScopeTagMappings(workspaceRoot: string) {
  const tsconfigBase = (await readAndCacheJsonFile(TSCONFIG_BASE, workspaceRoot)).json;

  const paths = tsconfigBase.compilerOptions.paths;

  if (!paths) {
    logCocInfo('no paths');
    return [];
  }

  const libPaths: TSConfigPath[] = Object.entries(paths).map(([key, indexPath]) => {
    return {
      libName: key,
      indexPath: (indexPath as string[])[0] as string,
    };
  });

  const mappings: ScopeTagMapping[] = libPaths.map((libPath) => {
    try {
      const projectJsonPath = libPath.indexPath.replace('src/index.ts', 'project.json');
      const projectJson = JSON.parse(readFileSync(join(workspaceRoot, projectJsonPath), 'utf-8'));

      if (!projectJson.tags) {
        return {
          path: libPath,
          scopeTag: undefined,
        };
      }

      return {
        path: libPath,
        scopeTag: projectJson.tags.find((t) => t.includes('scope:')),
      };
    } catch (error) {
      logCocInfo(error);

      return {
        path: libPath,
        scopeTag: undefined,
      };
    }
  });

  logCocInfo(mappings);

  tagMappings = mappings;
}

async function activate(context) {
  const tsExtension = extensions.all.find((e) => e.id === typeScriptExtensionId);

  const workspaceRoot = cwd();

  logCocInfo('tsExtension', tsExtension);

  if (!tsExtension) {
    logCocInfo('no tsExtension found');
    return;
  }

  await tsExtension.activate();

  if (!tsExtension.exports) {
    logCocInfo('no tsExtension.exports found');
    return;
  }

  const api = tsExtension.exports;

  logCocInfo('api ', api);

  if (!api) {
    logCocInfo('no api found');
    return;
  }

  workspace.onDidOpenTextDocument(
    (document) => {
      // logCocInfo('onDidOpenTextDocument. document:', document);

      if (document.uri.endsWith('.ts') || document.uri.endsWith('.tsx')) {
        // logCocInfo('onDidOpenTextDocument. TypeScript document found', document);
        configurePlugin(workspaceRoot, api, document.uri);
      }
    },
    undefined,
    context.subscriptions
  );

  watchFile(
    `${workspaceRoot}/${TSCONFIG_BASE}`,
    () => {
      clearJsonCache(TSCONFIG_BASE, workspaceRoot);
      configurePlugin(workspaceRoot, api);
      makeScopeTagMappings(workspaceRoot);
    },
    context.subscriptions
  );

  workspace.onDidChangeTextDocument(
    ({ textDocument }) => {
      // logCocInfo('onDidChangeTextDocument. textDocument', textDocument);
      if (textDocument.uri.endsWith(TSCONFIG_BASE)) {
        // logCocInfo('onDidChangeTextDocument. textDocument as TSCONFIG_BASE', textDocument.uri);
        configurePlugin(workspaceRoot, api);
      }
    },
    undefined,
    context.subscriptions
  );

  // configurePlugin(workspaceRoot, api);
  makeScopeTagMappings(workspaceRoot);
}

function makePath(p: string) {
  return p.split('nable-solutions/')[1].split('src')[0] + 'src/index.ts';
}

async function configurePlugin(workspaceRoot, api, documentUri?: string) {
  // TODO
  const enableLibraryImports = true;

  if (enableLibraryImports) {
    let externalFiles = await getExternalFiles(workspaceRoot);

    if (documentUri && documentUri.includes('nable-solutions/packages')) {
      const indexPath = makePath(documentUri);

      const found = tagMappings.find((tm) => {
        return tm.path.indexPath === indexPath;
      });

      if (found) {
        externalFiles = externalFiles.filter((ef) => {
          const foundScopeTag = tagMappings.find((tm) => makePath(ef.mainFile) === tm.path.indexPath)?.scopeTag;

          if (!foundScopeTag) {
            return true;
          }

          return found.scopeTag === foundScopeTag;
        });
      }
    }

    // logCocInfo('External Files:', externalFiles);
    api.configurePlugin('@monodon/typescript-nx-imports-plugin', {
      externalFiles,
    });
  }
}

async function getExternalFiles(workspaceRoot) {
  let tsconfig = (await readAndCacheJsonFile(TSCONFIG_BASE, workspaceRoot)).json;

  // logCocInfo('getExternalFiles tsconfig', tsconfig);

  if (!('compilerOptions' in tsconfig)) {
    tsconfig = (await readAndCacheJsonFile('tsconfig.json', workspaceRoot)).json;
    if (!('compilerOptions' in tsconfig)) {
      return [];
    }
  }

  const paths = tsconfig.compilerOptions.paths || {};

  const externals: any[] = [];

  for (const [, value] of Object.entries(paths)) {
    const mainFile = join(workspaceRoot, (value as any)[0]);
    const configFilePath = await findConfig(mainFile, TSCONFIG_LIB);

    if (!configFilePath) {
      continue;
    }

    const directory = dirname(configFilePath);
    externals.push({ mainFile, directory });
  }

  return externals;
}

/**
 * Watch a file and execute the callback on changes.
 *
 * Make sure to dispose of the filewatcher
 *
 * @param filePath
 * @param callback
 */
function watchFile(filePath, callback, disposable) {
  const filewatcher = workspace.createFileSystemWatcher(filePath);
  filewatcher.onDidChange(callback, disposable);
  return filewatcher;
}

async function forEachAncestorDirectory(directory, callback) {
  while (true) {
    const result = await callback(directory);
    if (result !== undefined) {
      return result;
    }

    const parentPath = dirname(directory);
    if (parentPath === directory) {
      return undefined;
    }

    directory = parentPath;
  }
}

async function findConfig(searchPath, configName) {
  return forEachAncestorDirectory(searchPath, async (ancestor) => {
    const fileName = join(ancestor, configName);
    try {
      if (await fileExists(fileName)) {
        return fileName;
      }
    } catch (e) {
      return undefined;
    }
  });
}

async function fileExists(filePath) {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

const files = {};
const fileContents = {};

async function readAndParseJson(filePath) {
  const content = await readFile(filePath, { encoding: 'utf-8' });

  // logCocInfo(`readAndParseJson. content for filePath: ${filePath}`, content);
  try {
    return JSON.parse(content);
  } catch {
    throw new Error('CHECK THIS AKIS');
    const errors = [];
    // const result = parseJson(content, errors);

    if (errors.length > 0) {
      for (const { error, offset } of errors) {
        // TODO(cammisuli): output this generically
        // getOutputChannel().appendLine(
        //   `${printParseErrorCode(
        //     error
        //   )} in JSON at position ${offset} in ${filePath}`
        // );
      }
    }

    // return result;
  }
}

function clearJsonCache(filePath, basedir = '') {
  const fullFilePath = path.join(basedir, filePath);
  return delete fileContents[fullFilePath];
}

async function readAndCacheJsonFile(filePath, basedir = '') {
  // logCocInfo('readAndCacheJsonFile filePath', filePath);

  if (!filePath) {
    logCocInfo('readAndCacheJsonFile no filePath', filePath);
    return {
      path: '',
      json: {},
    };
  }
  let fullFilePath = path.join(basedir, filePath);

  // logCocInfo('readAndCacheJsonFile fullFilePath', fullFilePath);

  if (fullFilePath.startsWith('file:\\')) {
    fullFilePath = fullFilePath.replace('file:\\', '');
  }
  try {
    // logCocInfo('readAndCacheJsonFile trying');
    const stats = await stat(fullFilePath);

    // logCocInfo('readAndCacheJsonFile stats', stats);
    if (fileContents[fullFilePath] || stats.isFile()) {
      fileContents[fullFilePath] ||= await readAndParseJson(fullFilePath);

      // logCocInfo('readAndCacheJsonFile fileContents[fullFilePath]', fileContents[fullFilePath]);
      return {
        path: fullFilePath,
        json: fileContents[fullFilePath],
      };
    }
  } catch (e) {
    logCocInfo('readAndCacheJsonFile error');
    // TODO(cammisuli): output this generically
    // getOutputChannel().appendLine(`${fullFilePath} does not exist`);
  }

  return {
    path: fullFilePath,
    json: {},
  };
}

/**
 * Caches already created json contents to a file path
 */
function cacheJson(filePath, basedir = '', content) {
  const fullFilePath = path.join(basedir, filePath);
  if (fileContents[fullFilePath]) {
    return {
      json: fileContents[fullFilePath],
      path: fullFilePath,
    };
  }

  if (content) {
    fileContents[fullFilePath] = content;
  }
  return {
    json: content,
    path: fullFilePath,
  };
}

exports.activate = activate;
