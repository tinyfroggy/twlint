import { parse } from "@babel/parser";

import * as t from "@babel/types";

import { VARIANT_CLASS_FUNCTIONS } from "./utils.js";

import type { ExtractedClassList } from "./utils.js";

export type JsClassSite = ExtractedClassList & {
  component?: string;
  /** Source range of each class token, for editor fixes. */
  ranges?: Map<string, [number, number]>;
};

const JS_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]);

/** Props whose value is a class list. */
const CLASS_PROP_NAMES = new Set(["className", "class", "classNames", "wrapperClassName"]);

export function isJsFile(filePath: string): boolean {
  const dot = filePath.lastIndexOf(".");
  return dot !== -1 && JS_EXTENSIONS.has(filePath.slice(dot).toLowerCase());
}

type Literal = { offset: number; value: string };

const PARSE_OPTIONS = [
  { sourceType: "unambiguous" as const, plugins: ["typescript", "jsx"] as const },
  { sourceType: "unambiguous" as const, plugins: ["jsx"] as const },
  { sourceType: "unambiguous" as const, plugins: ["typescript"] as const },
  { sourceType: "unambiguous" as const, plugins: [] as const },
];

function parseProgram(text: string): t.File | null {
  for (const options of PARSE_OPTIONS) {
    try {
      return parse(text, {
        sourceType: options.sourceType,
        plugins: [...options.plugins],
        errorRecovery: true,
      });
    } catch {
      // Try the next plugin combination.
    }
  }
  return null;
}

function isNode(value: unknown): value is t.Node {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { type?: unknown }).type === "string"
  );
}

const SKIP_KEYS = new Set(["loc", "start", "end", "leadingComments", "trailingComments", "extra"]);

function walk(node: t.Node, visit: (node: t.Node) => void): void {
  visit(node);

  const record = node as unknown as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (SKIP_KEYS.has(key)) continue;
    const value = record[key];
    if (Array.isArray(value)) {
      for (const item of value) {
        if (isNode(item)) walk(item, visit);
      }
    } else if (isNode(value)) {
      walk(value, visit);
    }
  }
}

function staticKeyName(node: t.Node | null | undefined): string | null {
  if (!node) return null;
  if (t.isIdentifier(node)) return node.name;
  if (t.isStringLiteral(node)) return node.value;
  return null;
}

function resolveLiterals(
  node: t.Node | null | undefined,
  bindings: Map<string, t.Node>,
  seen: Set<string>,
  functions: Set<string>,
): Literal[] {
  if (!node) return [];

  if (t.isStringLiteral(node)) {
    return [{ offset: node.start ?? -1, value: node.value }];
  }

  if (t.isTemplateLiteral(node)) {
    return node.quasis
      .filter((quasi) => typeof quasi.value.cooked === "string")
      .map((quasi) => ({ offset: quasi.start ?? -1, value: quasi.value.cooked ?? "" }));
  }

  if (t.isIdentifier(node)) {
    if (seen.has(node.name)) return [];
    const init = bindings.get(node.name);
    if (!init) return [];
    seen.add(node.name);
    const resolved = resolveLiterals(init, bindings, seen, functions);
    seen.delete(node.name);
    return resolved;
  }

  if (
    t.isParenthesizedExpression(node) ||
    t.isTSAsExpression(node) ||
    t.isTSSatisfiesExpression(node) ||
    t.isTSNonNullExpression(node) ||
    t.isTSTypeAssertion(node) ||
    t.isTypeCastExpression(node)
  ) {
    return resolveLiterals(node.expression, bindings, seen, functions);
  }

  if (t.isLogicalExpression(node) || t.isBinaryExpression(node)) {
    const operator = node.operator;
    if (operator === "||" || operator === "??" || operator === "&&") {
      return [
        ...resolveLiterals(node.left, bindings, seen, functions),
        ...resolveLiterals(node.right, bindings, seen, functions),
      ];
    }
    return [];
  }

  if (t.isConditionalExpression(node)) {
    return [
      ...resolveLiterals(node.consequent, bindings, seen, functions),
      ...resolveLiterals(node.alternate, bindings, seen, functions),
    ];
  }

  if (t.isArrayExpression(node)) {
    return node.elements.flatMap((element) =>
      element && !t.isSpreadElement(element)
        ? resolveLiterals(element, bindings, seen, functions)
        : [],
    );
  }

  if (t.isObjectExpression(node)) {
    return resolveObjectLiterals(node, bindings, seen, functions);
  }

  if (t.isCallExpression(node) || t.isOptionalCallExpression(node)) {
    const callee = node.callee;
    if (t.isIdentifier(callee) && functions.has(callee.name)) {
      return node.arguments.flatMap((argument) =>
        t.isArgumentPlaceholder(argument)
          ? []
          : resolveLiterals(argument, bindings, seen, functions),
      );
    }
    return [];
  }

  if (t.isJSXExpressionContainer(node)) {
    return resolveLiterals(node.expression, bindings, seen, functions);
  }

  return [];
}

function resolveObjectLiterals(
  node: t.ObjectExpression,
  bindings: Map<string, t.Node>,
  seen: Set<string>,
  functions: Set<string>,
): Literal[] {
  const out: Literal[] = [];

  for (const property of node.properties) {
    if (t.isSpreadElement(property)) {
      out.push(...resolveLiterals(property.argument, bindings, seen, functions));
      continue;
    }
    if (!t.isObjectProperty(property)) continue;

    // A quoted key in a classnames-style object is a class.
    if (!property.computed && t.isStringLiteral(property.key)) {
      out.push({ offset: property.key.start ?? -1, value: property.key.value });
    }

    out.push(...resolveLiterals(property.value as t.Node, bindings, seen, functions));
  }

  return out;
}

function jsxElementName(
  name: t.JSXIdentifier | t.JSXMemberExpression | t.JSXNamespacedName,
): string | null {
  if (t.isJSXIdentifier(name)) return name.name;
  if (t.isJSXMemberExpression(name)) {
    const object = jsxElementName(name.object as t.JSXIdentifier | t.JSXMemberExpression);
    return object ? `${object}.${name.property.name}` : name.property.name;
  }
  return null;
}

function attributeExpression(attr: t.JSXAttribute): t.Node | null {
  if (!attr.value) return null;
  if (t.isStringLiteral(attr.value)) return attr.value;
  if (t.isJSXExpressionContainer(attr.value) && !t.isJSXEmptyExpression(attr.value.expression)) {
    return attr.value.expression;
  }
  return null;
}

function classPropertyValue(object: t.ObjectExpression): t.Node | null {
  for (const property of object.properties) {
    if (!t.isObjectProperty(property) || property.computed) continue;
    const name = staticKeyName(property.key);
    if (name && CLASS_PROP_NAMES.has(name)) return property.value as t.Node;
  }
  return null;
}

type SiteExpression = { expression: t.Node; component?: string };

function collectExpressions(program: t.Node, functions: Set<string>): SiteExpression[] {
  const expressions: SiteExpression[] = [];

  walk(program, (node) => {
    if (t.isJSXOpeningElement(node)) {
      const component = jsxElementName(node.name) ?? undefined;
      for (const attr of node.attributes) {
        if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name)) {
          const name = attr.name.name;
          if (!CLASS_PROP_NAMES.has(name)) continue;
          const expression = attributeExpression(attr);
          if (expression) expressions.push({ expression, component });
          continue;
        }

        if (t.isJSXSpreadAttribute(attr) && t.isObjectExpression(attr.argument)) {
          const expression = classPropertyValue(attr.argument);
          if (expression) expressions.push({ expression, component });
        }
      }
      return;
    }

    if (
      t.isObjectProperty(node) &&
      !node.computed &&
      (t.isIdentifier(node.key) || t.isStringLiteral(node.key))
    ) {
      const name = staticKeyName(node.key);
      if (name && CLASS_PROP_NAMES.has(name)) {
        expressions.push({ expression: node.value as t.Node });
      }
      return;
    }

    if (
      t.isCallExpression(node) &&
      t.isIdentifier(node.callee) &&
      functions.has(node.callee.name)
    ) {
      for (const argument of node.arguments) {
        if (!t.isArgumentPlaceholder(argument)) expressions.push({ expression: argument });
      }
    }
  });

  return expressions;
}

/**
 * Class sites with literal values resolved through local variable bindings,
 * simple unions/ternaries, objects, arrays, and class-helper calls. Reports
 * each source literal once, so a value read from two sites is not duplicated.
 * Returns `[]` when the file cannot be parsed, letting callers fall back to
 * text extraction.
 */
export function collectJsClassSites(
  text: string,
  functions: Set<string> = VARIANT_CLASS_FUNCTIONS,
): JsClassSite[] {
  const program = parseProgram(text);
  if (!program) return [];

  const bindings = new Map<string, t.Node>();
  walk(program, (node) => {
    if (t.isVariableDeclarator(node) && t.isIdentifier(node.id) && node.init) {
      bindings.set(node.id.name, node.init);
    }
  });

  const byOffset = new Map<
    number,
    { tokens: Set<string>; ranges: Map<string, [number, number]>; component?: string }
  >();

  for (const { expression, component } of collectExpressions(program, functions)) {
    for (const literal of resolveLiterals(expression, bindings, new Set(), functions)) {
      if (literal.offset < 0) continue;
      const tokens = literal.value.split(/\s+/).filter(Boolean);
      if (tokens.length === 0) continue;

      let entry = byOffset.get(literal.offset);
      if (!entry) {
        entry = { tokens: new Set(), ranges: new Map() };
        byOffset.set(literal.offset, entry);
      }
      if (component && !entry.component) entry.component = component;

      let cursor = literal.offset;
      for (const token of tokens) {
        entry.tokens.add(token);
        const at = text.indexOf(token, cursor);
        if (at !== -1) {
          entry.ranges.set(token, [at, at + token.length]);
          cursor = at + token.length;
        }
      }
    }
  }

  return [...byOffset.entries()]
    .sort(([a], [b]) => a - b)
    .map(([offset, entry]) => {
      const classes = [...entry.tokens];
      return {
        offset,
        classes,
        raw: classes.join(" "),
        component: entry.component,
        ranges: entry.ranges,
      };
    });
}
