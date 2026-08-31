import { readdirSync, readFileSync } from "node:fs";
import { extname, isAbsolute, join, relative, resolve } from "node:path";
import ts from "typescript";

type ModuleGraph = Map<string, Set<string>>;

function normalizePath(path: string) {
  return resolve(path).replaceAll("\\", "/");
}

function listTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? listTypeScriptFiles(path)
      : [".ts", ".tsx", ".mts", ".cts"].includes(extname(entry.name))
        ? [normalizePath(path)]
        : [];
  });
}

function readCompilerOptions(projectRoot: string) {
  const configPath = resolve(projectRoot, "tsconfig.json");
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error) {
    throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"));
  }
  return ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    projectRoot,
    undefined,
    configPath,
  ).options;
}

function moduleSpecifiers(sourceFile: ts.SourceFile) {
  const specifiers = new Set<string>();
  const addLiteral = (node: ts.Node | undefined) => {
    if (node && ts.isStringLiteralLike(node)) specifiers.add(node.text);
  };

  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      addLiteral(node.moduleSpecifier);
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      addLiteral(node.moduleReference.expression);
    } else if (ts.isCallExpression(node)) {
      const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
      const isRequire =
        ts.isIdentifier(node.expression) && node.expression.text === "require";
      if (isDynamicImport || isRequire) addLiteral(node.arguments[0]);
    } else if (ts.isImportTypeNode(node)) {
      const argument = node.argument;
      if (ts.isLiteralTypeNode(argument)) addLiteral(argument.literal);
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return [...specifiers];
}

function buildModuleGraph(
  projectRoot: string,
  entryFiles: readonly string[],
): ModuleGraph {
  const compilerOptions = readCompilerOptions(projectRoot);
  const graph: ModuleGraph = new Map();
  const pending = entryFiles.map(normalizePath);

  while (pending.length > 0) {
    const file = pending.pop();
    if (!file || graph.has(file)) continue;

    const source = readFileSync(file, "utf8");
    const scriptKind = file.endsWith(".tsx")
      ? ts.ScriptKind.TSX
      : ts.ScriptKind.TS;
    const sourceFile = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
      scriptKind,
    );
    const dependencies = new Set<string>();

    for (const specifier of moduleSpecifiers(sourceFile)) {
      const resolvedModule = ts.resolveModuleName(
        specifier,
        file,
        compilerOptions,
        ts.sys,
      ).resolvedModule;
      if (!resolvedModule || resolvedModule.isExternalLibraryImport) continue;
      const dependency = normalizePath(resolvedModule.resolvedFileName);
      dependencies.add(dependency);
      pending.push(dependency);
    }
    graph.set(file, dependencies);
  }

  return graph;
}

function serviceRoleConsumers(graph: ModuleGraph, target: string) {
  const normalizedTarget = normalizePath(target);
  const reverseGraph = new Map<string, Set<string>>();
  for (const [consumer, dependencies] of graph) {
    for (const dependency of dependencies) {
      const consumers = reverseGraph.get(dependency) ?? new Set<string>();
      consumers.add(consumer);
      reverseGraph.set(dependency, consumers);
    }
  }

  const consumers = new Set<string>();
  const pending = [normalizedTarget];
  while (pending.length > 0) {
    const dependency = pending.pop();
    if (!dependency) continue;
    for (const consumer of reverseGraph.get(dependency) ?? []) {
      if (consumer === normalizedTarget || consumers.has(consumer)) continue;
      consumers.add(consumer);
      pending.push(consumer);
    }
  }
  return consumers;
}

function displayPath(projectRoot: string, path: string) {
  const projectRelative = relative(projectRoot, path);
  return !projectRelative.startsWith("..") && !isAbsolute(projectRelative)
    ? projectRelative.replaceAll("\\", "/")
    : normalizePath(path);
}

export function assertServiceRoleAllowlist(options: {
  projectRoot: string;
  allowedConsumers: readonly string[];
  entryFiles?: readonly string[];
}) {
  const projectRoot = normalizePath(options.projectRoot);
  const entryFiles =
    options.entryFiles ?? listTypeScriptFiles(resolve(projectRoot, "src"));
  const graph = buildModuleGraph(projectRoot, entryFiles);
  const target = resolve(projectRoot, "src/lib/supabase-admin.ts");
  const allowed = new Set(
    options.allowedConsumers.map((path) => normalizePath(resolve(projectRoot, path))),
  );
  const unexpected = [...serviceRoleConsumers(graph, target)]
    .filter((path) => !allowed.has(path))
    .map((path) => displayPath(projectRoot, path))
    .sort();

  if (unexpected.length > 0) {
    throw new Error(
      `Nicht erlaubte transitive Service-Role-Nutzung:\n${unexpected.join("\n")}`,
    );
  }
}
