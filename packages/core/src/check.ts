import ts from 'typescript';
import { existsSync } from 'node:fs';
import { basename, relative, resolve } from 'node:path';
import { discover } from './routes.ts';

export interface CheckDiagnostic {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  file?: string;
  line?: number;
  column?: number;
  contract?: { file: string; line: number; column: number };
}
export interface CheckResult {
  schemaVersion: 1;
  project: string;
  routes: number;
  verified: number;
  diagnostics: CheckDiagnostic[];
}
export interface CheckOptions { root?: string; project?: string; strict?: boolean; onFiles?: (files: string[]) => void }

/** Analyze source only. No application imports, config execution, generation or emit. */
export async function checkRoutes(options: CheckOptions = {}): Promise<CheckResult> {
  const root = resolve(options.root ?? process.cwd());
  const project = resolve(root, options.project ?? (existsSync(resolve(root, 'tsconfig.node.json')) ? 'tsconfig.node.json' : 'tsconfig.json'));
  const result: CheckResult = { schemaVersion: 1, project: relative(root, project).replaceAll('\\', '/'), routes: 0, verified: 0, diagnostics: [] };
  const fileName = (file: string) => relative(root, file).replaceAll('\\', '/');
  const position = (node: ts.Node) => {
    const source = node.getSourceFile();
    const { line, character } = source.getLineAndCharacterOfPosition(node.getStart());
    return { file: fileName(source.fileName), line: line + 1, column: character + 1 };
  };
  const configError = (error: ts.Diagnostic) => {
    const location = error.file && error.start !== undefined ? error.file.getLineAndCharacterOfPosition(error.start) : undefined;
    result.diagnostics.push({ code: 'FA1000', severity: 'error', message: ts.flattenDiagnosticMessageText(error.messageText, '\n'), ...(error.file ? { file: fileName(error.file.fileName) } : {}), ...(location ? { line: location.line + 1, column: location.character + 1 } : {}) });
  };
  const config = ts.readConfigFile(project, ts.sys.readFile);
  if (config.error) { configError(config.error); return result; }
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, resolve(project, '..'), undefined, project);
  if (parsed.errors.length) { parsed.errors.forEach(configError); return result; }
  let routes;
  try { routes = await discover(resolve(root, 'src/server/api'), 'api'); }
  catch (error) { result.diagnostics.push({ code: 'FA1001', severity: 'error', message: String(error instanceof Error ? error.message : error) }); return result; }
  result.routes = routes.length;
  const program = ts.createProgram({ rootNames: [...new Set([...parsed.fileNames, ...routes.map(route => resolve(root, 'src/server/api', route.file))])], options: { ...parsed.options, noEmit: true } });
  options.onFiles?.(program.getSourceFiles().filter(file => !file.isDeclarationFile && !file.fileName.replaceAll('\\', '/').includes('/node_modules/')).map(file => file.fileName));
  const checker = program.getTypeChecker();
  function symbol(node: ts.Node): ts.Symbol | undefined {
    const value = checker.getSymbolAtLocation(node);
    return value && value.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(value) : value;
  }
  function unwrap(node: ts.Node): ts.Node {
    while (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) || ts.isSatisfiesExpression(node) || ts.isNonNullExpression(node)) node = node.expression;
    return node;
  }
  function value(node: ts.Node | undefined, seen = new Set<ts.Node>()): ts.Node | undefined {
    if (!node || seen.has(node) || seen.size > 100) return undefined;
    seen.add(node); node = unwrap(node);
    if (ts.isIdentifier(node) || ts.isPropertyAccessExpression(node)) {
      const declaration = symbol(ts.isPropertyAccessExpression(node) ? node.name : node)?.valueDeclaration;
      if (declaration && ts.isVariableDeclaration(declaration) && declaration.parent.flags & ts.NodeFlags.Const) return value(declaration.initializer, seen);
      if (declaration && ts.isExportAssignment(declaration)) return value(declaration.expression, seen);
      if (declaration && ts.isPropertyAssignment(declaration)) return value(declaration.initializer, seen);
      if (ts.isPropertyAccessExpression(node)) return property(value(node.expression, seen), node.name.text, seen);
      return undefined;
    }
    return node;
  }
  function property(node: ts.Node | undefined, key: string, seen = new Set<ts.Node>()): ts.Node | undefined {
    if (!node || !ts.isObjectLiteralExpression(node)) return undefined;
    for (const field of [...node.properties].reverse()) {
      if (ts.isSpreadAssignment(field)) {
        const spread = value(field.expression, new Set(seen));
        if (!spread || !ts.isObjectLiteralExpression(spread)) return undefined;
        const found = property(spread, key, new Set(seen));
        if (found) return found;
        // An unresolved nested spread could override earlier fields.
        if (spread.properties.some(field => ts.isSpreadAssignment(field) || field.name && (ts.isComputedPropertyName(field.name) || (ts.isIdentifier(field.name) || ts.isStringLiteral(field.name)) && field.name.text === key))) return undefined;
      } else {
        if (field.name && ts.isComputedPropertyName(field.name)) return undefined;
        if (field.name && (ts.isIdentifier(field.name) || ts.isStringLiteral(field.name)) && field.name.text === key) {
          if (ts.isPropertyAssignment(field)) return value(field.initializer, new Set(seen));
          if (ts.isShorthandPropertyAssignment(field)) {
            const declaration = checker.getShorthandAssignmentValueSymbol(field)?.valueDeclaration;
            return declaration && ts.isVariableDeclaration(declaration) && declaration.parent.flags & ts.NodeFlags.Const ? value(declaration.initializer, new Set(seen)) : undefined;
          }
          return undefined;
        }
      }
    }
    return undefined;
  }
  function apiCall(node: ts.Node | undefined, name: string, module: string): node is ts.CallExpression {
    if (!node || !ts.isCallExpression(node)) return false;
    const target = symbol(ts.isPropertyAccessExpression(node.expression) ? node.expression.name : node.expression);
    return target?.name === name && !!target.declarations?.some(declaration => {
      const path = declaration.getSourceFile().fileName.replaceAll('\\', '/');
      return /\/(?:@fastang\/core|packages\/core)\/(?:src|dist)\//.test(path) && [module + '.ts', module + '.d.ts'].includes(basename(path));
    });
  }
  const syntaxFiles = new Set<string>();
  for (const route of routes) {
    const source = program.getSourceFile(resolve(root, 'src/server/api', route.file));
    if (!source) continue;
    const expected = `${route.method} /api${route.path ? '/' + route.path : ''}`;
    const module = checker.getSymbolAtLocation(source);
    const exported = module && checker.getExportsOfModule(module).find(item => item.name === 'default');
    const declaration = exported && (exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported).valueDeclaration;
    const expression = declaration && (ts.isExportAssignment(declaration) ? value(declaration.expression) : ts.isVariableDeclaration(declaration) ? value(declaration.initializer) : declaration);
    if (apiCall(expression, 'defineApiRoute', 'api')) continue;
    const warn = (message: string) => result.diagnostics.push({ code: 'FA1003', severity: options.strict ? 'error' : 'warning', message: `${expected}: ${message}`, ...position(declaration ?? source) });
    if (!apiCall(expression, 'defineContractRoute', 'contract-route')) { warn('Route export is not a statically resolvable defineContractRoute or defineApiRoute call; registration-time validation still applies to contract routes.'); continue; }
    const contract = value(expression.arguments[0]);
    if (!apiCall(contract, 'defineApiContract', 'contracts')) { warn('Contract is dynamic or unresolved; static correspondence cannot be verified.'); continue; }
    const definition = value(contract.arguments[0]);
    const method = property(definition, 'method');
    const path = property(definition, 'path');
    if (!method || !path || !ts.isStringLiteralLike(method) || !ts.isStringLiteralLike(path)) { warn('Contract method/path must resolve to string literals or const references.'); continue; }
    const actual = `${method.text} ${path.text}`;
    if (actual !== expected) result.diagnostics.push({ code: 'FA1002', severity: 'error', message: `File route ${expected}, contract ${actual}. Update the contract or rename/move the route file.`, ...position(expression.getSourceFile() === source ? expression : source), contract: position(contract) });
    else result.verified++;
    syntaxFiles.add(contract.getSourceFile().fileName);
  }
  routes.forEach(route => syntaxFiles.add(resolve(root, 'src/server/api', route.file)));
  for (const file of syntaxFiles) {
    const source = program.getSourceFile(file);
    if (source) program.getSyntacticDiagnostics(source).forEach(configError);
  }
  result.diagnostics.sort((a, b) => (a.file ?? '').localeCompare(b.file ?? '') || (a.line ?? 0) - (b.line ?? 0) || a.code.localeCompare(b.code));
  return result;
}

export function formatCheck(result: CheckResult): string {
  const lines = result.diagnostics.map(d => `${d.file ?? result.project}${d.line ? `:${d.line}:${d.column}` : ''} ${d.severity} ${d.code}: ${d.message}${d.contract ? `\n  Contract: ${d.contract.file}:${d.contract.line}:${d.contract.column}` : ''}`);
  lines.push(`FastAng routes: ${result.verified} contracts verified, ${result.routes} API routes, ${result.diagnostics.filter(d => d.severity === 'error').length} errors, ${result.diagnostics.filter(d => d.severity === 'warning').length} warnings.`);
  return lines.join('\n');
}
