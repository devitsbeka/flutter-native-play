import { createHash } from 'node:crypto'
import ts from 'typescript'
import type { Plugin } from 'vite'

const EVENT = 'spark:dictionary-delta'
const UNSAFE = new Set(['__proto__', 'prototype', 'constructor'])
type Leaf = { path: string[]; value: string; start: number; end: number }
type Dictionary = { name: string; leaves: Leaf[] }
export type DictionaryDelta = {
  moduleId: string; exportName: string; path: string[]; before: string; after: string; beforeHash: string; afterHash: string
}
const hash = (source: string) => createHash('sha256').update(source, 'utf8').digest('hex')

function dictionaries(source: string): Dictionary[] {
  if (Buffer.byteLength(source) > 1024 * 1024) return []
  const ast = ts.createSourceFile('dictionary.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  if ((ast as ts.SourceFile & { parseDiagnostics?: readonly unknown[] }).parseDiagnostics?.length) return []
  // An arbitrary module binding could hide the global namespace used by the
  // appended receiver. Refuse that module and leave ordinary HMR untouched.
  let shadowed = false
  const bound = (name: ts.BindingName): boolean => ts.isIdentifier(name) ? name.text === 'globalThis' : name.elements.some(element => ts.isBindingElement(element) && bound(element.name))
  const visit = (node: ts.Node) => {
    if ((ts.isVariableDeclaration(node) || ts.isParameter(node) || ts.isBindingElement(node)) && bound(node.name) ||
      (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isClassDeclaration(node) || ts.isClassExpression(node) || ts.isImportClause(node) || ts.isImportSpecifier(node) || ts.isNamespaceImport(node) || ts.isImportEqualsDeclaration(node) || ts.isEnumDeclaration(node) || ts.isModuleDeclaration(node)) && node.name?.text === 'globalThis') shadowed = true
    ts.forEachChild(node, visit)
  }
  visit(ast)
  if (shadowed) return []
  const result: Dictionary[] = []
  const unwrap = (value: ts.Expression): ts.Expression => ts.isAsExpression(value) || ts.isSatisfiesExpression(value) || ts.isParenthesizedExpression(value) ? unwrap(value.expression) : value
  function walk(node: ts.ObjectLiteralExpression, path: string[], leaves: Leaf[]): boolean {
    if (path.length > 32) return false
    const keys = new Set<string>()
    for (const prop of node.properties) {
      if (!ts.isPropertyAssignment(prop) || ts.isComputedPropertyName(prop.name)) return false
      if (!ts.isIdentifier(prop.name) && !ts.isStringLiteral(prop.name) && !ts.isNumericLiteral(prop.name)) return false
      const key = prop.name.text
      if (!key || key.length > 200 || UNSAFE.has(key) || keys.has(key)) return false
      keys.add(key)
      const value = unwrap(prop.initializer), next = [...path, key]
      if (ts.isObjectLiteralExpression(value)) { if (!walk(value, next, leaves)) return false }
      else if (ts.isStringLiteral(value)) leaves.push({ path: next, value: value.text, start: value.getStart(ast), end: value.end })
      else if (!ts.isNumericLiteral(value) && value.kind !== ts.SyntaxKind.TrueKeyword && value.kind !== ts.SyntaxKind.FalseKeyword && value.kind !== ts.SyntaxKind.NullKeyword) return false
    }
    return true
  }
  const declared = new Set<string>()
  for (const statement of ast.statements) {
    if (ts.isEmptyStatement(statement) || ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) continue
    if (ts.isExpressionStatement(statement) && ts.isStringLiteral(statement.expression)) continue
    if (ts.isImportDeclaration(statement)) {
      const clause = statement.importClause
      if (clause?.isTypeOnly || clause && !clause.name && clause.namedBindings && ts.isNamedImports(clause.namedBindings) && clause.namedBindings.elements.length > 0 && clause.namedBindings.elements.every(item => item.isTypeOnly)) continue
      return []
    }
    if (ts.isExportDeclaration(statement)) {
      if (statement.isTypeOnly || statement.exportClause && ts.isNamedExports(statement.exportClause) && statement.exportClause.elements.length > 0 && statement.exportClause.elements.every(item => item.isTypeOnly)) continue
      return []
    }
    if (ts.isExportAssignment(statement)) {
      if (!statement.isExportEquals && ts.isIdentifier(statement.expression) && declared.has(statement.expression.text)) continue
      return []
    }
    if (!ts.isVariableStatement(statement) || !(statement.declarationList.flags & ts.NodeFlags.Const) || statement.modifiers?.some(item => item.kind === ts.SyntaxKind.DeclareKeyword)) return []
    const exported = statement.modifiers?.some(item => item.kind === ts.SyntaxKind.ExportKeyword)
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !declaration.initializer || UNSAFE.has(declaration.name.text) || declared.has(declaration.name.text)) return []
      declared.add(declaration.name.text)
      const value = unwrap(declaration.initializer), leaves: Leaf[] = []
      if (ts.isObjectLiteralExpression(value)) {
        if (!walk(value, [], leaves)) return []
        if (exported && leaves.length) result.push({ name: declaration.name.text, leaves })
      } else if (!ts.isStringLiteral(value) && !ts.isNumericLiteral(value) && value.kind !== ts.SyntaxKind.TrueKeyword && value.kind !== ts.SyntaxKind.FalseKeyword && value.kind !== ts.SyntaxKind.NullKeyword) return []
    }
  }
  return result
}

/** Only one real string initializer may differ; all surrounding source bytes must match. */
export function dictionaryDelta(moduleId: string, before: string, after: string): DictionaryDelta | null {
  if (before === after) return null
  const old = dictionaries(before), next = dictionaries(after)
  for (const dictionary of old) {
    const replacement = next.find(value => value.name === dictionary.name)
    if (!replacement || replacement.leaves.length !== dictionary.leaves.length) continue
    const changed = dictionary.leaves.filter((leaf, index) => leaf.value !== replacement.leaves[index].value)
    if (changed.length !== 1) continue
    const leaf = changed[0], newer = replacement.leaves[dictionary.leaves.indexOf(leaf)]
    if (JSON.stringify(leaf.path) !== JSON.stringify(newer.path) || before.slice(0, leaf.start) !== after.slice(0, newer.start) || before.slice(leaf.end) !== after.slice(newer.end) || leaf.value.length > 4096 || newer.value.length > 4096) continue
    return { moduleId, exportName: dictionary.name, path: leaf.path, before: leaf.value, after: newer.value, beforeHash: hash(before), afterHash: hash(after) }
  }
  return null
}

/** Runs inside the genuine module and mutates only its original exported objects. */
export function dictionaryReceiver(moduleId: string, sourceHash: string, exports: string[]): string {
  const bindings = exports.map(name => `[${JSON.stringify(name)},${name}]`).join(',')
  return `\n;if(import.meta.hot){((objects)=>{const hot=import.meta.hot,id=${globalThis.JSON.stringify(moduleId)};let revision=${globalThis.JSON.stringify(sourceHash)};
const receive=d=>{try{
 if(!d||typeof d!=='object'||globalThis.Array.isArray(d)||globalThis.Object.keys(d).sort().join(',')!=='after,afterHash,before,beforeHash,exportName,moduleId,path'||d.moduleId!==id||typeof d.exportName!=='string'||!objects.has(d.exportName)||!globalThis.Array.isArray(d.path)||!d.path.length||d.path.length>32||d.path.some(k=>typeof k!=='string'||!k||k.length>200||['__proto__','prototype','constructor'].includes(k))||typeof d.before!=='string'||typeof d.after!=='string'||d.before.length>4096||d.after.length>4096||d.before===d.after||typeof d.beforeHash!=='string'||typeof d.afterHash!=='string'||!/^[a-f0-9]{64}$/.test(d.beforeHash)||!/^[a-f0-9]{64}$/.test(d.afterHash)||d.beforeHash!==revision||globalThis.JSON.stringify(d).length>12000)return;
 let object=objects.get(d.exportName);for(const key of d.path.slice(0,-1)){if(!object||typeof object!=='object')return;const desc=globalThis.Object.getOwnPropertyDescriptor(object,key);if(!desc||!('value'in desc)||!desc.value||typeof desc.value!=='object')return;object=desc.value;}
 if(!object||typeof object!=='object')return;const key=d.path[d.path.length-1],desc=globalThis.Object.getOwnPropertyDescriptor(object,key);if(!desc||!('value'in desc)||!desc.writable||desc.value!==d.before)return;
 object[key]=d.after;revision=d.afterHash;globalThis.window.dispatchEvent(new globalThis.CustomEvent('spark:dictionary-updated',{detail:{moduleId:id,exportName:d.exportName,hash:revision,dictionary:objects.get(d.exportName)}}));
 }catch{/* Stale or unsupported events converge through ordinary Vite HMR. */}};
 hot.on('${EVENT}',receive);hot.dispose(()=>hot.off('${EVENT}',receive));})(new globalThis.Map([${bindings}]));}\n`
}

/** Optional development optimization. Default Vite HMR always remains authoritative. */
export function localeDeltaPlugin(): Plugin {
  const sources = new Map<string, { source: string; moduleId: string }>()
  let root = '', enabled = false
  return {
    name: 'spark-dictionary-delta', apply: 'serve', enforce: 'pre',
    configResolved(config) { root = config.root.replaceAll('\\', '/').replace(/\/$/, ''); enabled = config.command === 'serve' },
    transform(source, id) {
      if (!enabled || id.includes('?') || !/\.(?:[cm]?ts|[cm]?js)$/.test(id)) return null
      const normalized = id.replaceAll('\\', '/')
      if (!normalized.startsWith(`${root}/`) || normalized.includes('/node_modules/')) return null
      const found = dictionaries(source)
      if (!found.length) { sources.delete(id); return null }
      const moduleId = normalized.slice(root.length)
      if (sources.size >= 256 && !sources.has(id)) sources.delete(sources.keys().next().value!)
      sources.set(id, { source, moduleId })
      return { code: source + dictionaryReceiver(moduleId, hash(source), found.map(value => value.name)), map: null }
    },
    async handleHotUpdate(ctx) {
      const previous = sources.get(ctx.file)
      if (!enabled || !previous) return
      const source = await ctx.read(), delta = dictionaryDelta(previous.moduleId, previous.source, source)
      if (!delta) { sources.delete(ctx.file); return }
      sources.set(ctx.file, { ...previous, source })
      ctx.server.ws.send({ type: 'custom', event: EVENT, data: delta })
      // Do not return []: default module updates preserve canonical convergence.
    },
    closeBundle() { sources.clear() },
  }
}
export default localeDeltaPlugin
