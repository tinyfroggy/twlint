import { parse } from "@babel/parser";

import { VARIANT_CLASS_FUNCTIONS } from "./utils.js";

import type { ExtractedClassList } from "./utils.js";

export type JsClassSite = ExtractedClassList & {
  component?: string;
  /** Source range of each class token, for editor fixes. */
  ranges?: Map<string, [number, number]>;
};

/**
 * Minimal Babel AST node shape. Structural checks replace the
 * `@babel/types` helpers so the package does not need that direct
 * dependency (`@babel/parser` still provides the parser itself).
 */
type Node = {
  type: string;
  start?: number | null;
  [key: string]: unknown;
};

type FileNode = Node & { program?: unknown };

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

function parseProgram(text: string): FileNode | null {
  for (const options of PARSE_OPTIONS) {
    try {
      return parse(text, {
        sourceType: options.sourceType,
        plugins: [...options.plugins],
        errorRecovery: true,
      }) as unknown as FileNode;
    } catch {
      // Try the next plugin combination.
    }
  }
  return null;
}

function isNode(value: unknown): value is Node {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { type?: unknown }).type === "string"
  );
}

function isType(node: Node | null | undefined, type: string): boolean {
  return node?.type === type;
}

function asNode(value: unknown): Node | null {
  return isNode(value) ? value : null;
}

function nodeName(node: Node): string | null {
  return typeof node.name === "string" ? (node.name as string) : null;
}

function nodeValue(node: Node): string | null {
  return typeof node.value === "string" ? (node.value as string) : null;
}

const SKIP_KEYS = new Set(["loc", "start", "end", "leadingComments", "trailingComments", "extra"]);

function walk(node: Node, visit: (node: Node) => void): void {
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

function staticKeyName(node: Node | null | undefined): string | null {
  if (!node) return null;
  if (isType(node, "Identifier")) return nodeName(node);
  if (isType(node, "StringLiteral")) return nodeValue(node);
  return null;
}

function resolveLiterals(
  node: Node | null | undefined,
  bindings: Map<string, Node>,
  seen: Set<string>,
  functions: Set<string>,
): Literal[] {
  if (!node) return [];

  if (isType(node, "StringLiteral")) {
    const value = nodeValue(node);
    if (value === null) return [];
    return [{ offset: node.start ?? -1, value }];
  }

  if (isType(node, "TemplateLiteral")) {
    const quasis = node.quasis;
    if (!Array.isArray(quasis)) return [];
    return quasis.flatMap((quasi) => {
      if (!isNode(quasi)) return [];
      const value = (quasi.value as { cooked?: unknown } | undefined)?.cooked;
      if (typeof value !== "string") return [];
      return [{ offset: quasi.start ?? -1, value }];
    });
  }

  if (isType(node, "Identifier")) {
    const name = nodeName(node);
    if (!name) return [];
    if (seen.has(name)) return [];
    const init = bindings.get(name);
    if (!init) return [];
    seen.add(name);
    const resolved = resolveLiterals(init, bindings, seen, functions);
    seen.delete(name);
    return resolved;
  }

  if (
    isType(node, "ParenthesizedExpression") ||
    isType(node, "TSAsExpression") ||
    isType(node, "TSSatisfiesExpression") ||
    isType(node, "TSNonNullExpression") ||
    isType(node, "TSTypeAssertion") ||
    isType(node, "TypeCastExpression")
  ) {
    return resolveLiterals(asNode(node.expression), bindings, seen, functions);
  }

  if (isType(node, "LogicalExpression") || isType(node, "BinaryExpression")) {
    const operator = node.operator;
    if (operator === "||" || operator === "??" || operator === "&&") {
      return [
        ...resolveLiterals(asNode(node.left), bindings, seen, functions),
        ...resolveLiterals(asNode(node.right), bindings, seen, functions),
      ];
    }
    return [];
  }

  if (isType(node, "ConditionalExpression")) {
    return [
      ...resolveLiterals(asNode(node.consequent), bindings, seen, functions),
      ...resolveLiterals(asNode(node.alternate), bindings, seen, functions),
    ];
  }

  if (isType(node, "ArrayExpression")) {
    const elements = node.elements;
    if (!Array.isArray(elements)) return [];
    return elements.flatMap((element) =>
      isNode(element) && !isType(element, "SpreadElement")
        ? resolveLiterals(element, bindings, seen, functions)
        : [],
    );
  }

  if (isType(node, "ObjectExpression")) {
    return resolveObjectLiterals(node, bindings, seen, functions);
  }

  if (isType(node, "CallExpression") || isType(node, "OptionalCallExpression")) {
    const callee = asNode(node.callee);
    const calleeName = callee && isType(callee, "Identifier") ? nodeName(callee) : null;
    if (calleeName && functions.has(calleeName)) {
      const args = node.arguments;
      if (!Array.isArray(args)) return [];
      return args.flatMap((argument) =>
        isNode(argument) && !isType(argument, "ArgumentPlaceholder")
          ? resolveLiterals(argument, bindings, seen, functions)
          : [],
      );
    }
    return [];
  }

  if (isType(node, "JSXExpressionContainer")) {
    return resolveLiterals(asNode(node.expression), bindings, seen, functions);
  }

  return [];
}

function resolveObjectLiterals(
  node: Node,
  bindings: Map<string, Node>,
  seen: Set<string>,
  functions: Set<string>,
): Literal[] {
  const out: Literal[] = [];
  const properties = node.properties;
  if (!Array.isArray(properties)) return out;

  for (const property of properties) {
    if (!isNode(property)) continue;
    if (isType(property, "SpreadElement")) {
      out.push(...resolveLiterals(asNode(property.argument), bindings, seen, functions));
      continue;
    }
    if (!isType(property, "ObjectProperty")) continue;

    // A quoted key in a classnames-style object is a class.
    const key = asNode(property.key);
    if (
      key &&
      property.computed !== true &&
      isType(key, "StringLiteral") &&
      typeof key.value === "string"
    ) {
      out.push({ offset: key.start ?? -1, value: key.value as string });
    }

    out.push(...resolveLiterals(asNode(property.value), bindings, seen, functions));
  }

  return out;
}

function jsxElementName(name: Node | null | undefined): string | null {
  if (!name) return null;
  if (isType(name, "JSXIdentifier")) {
    return typeof name.name === "string" ? (name.name as string) : null;
  }
  if (isType(name, "JSXMemberExpression")) {
    const object = jsxElementName(asNode(name.object));
    const property = asNode(name.property);
    const propertyName =
      property && isType(property, "JSXIdentifier") && typeof property.name === "string"
        ? (property.name as string)
        : null;
    if (!propertyName) return null;
    return object ? `${object}.${propertyName}` : propertyName;
  }
  return null;
}

function attributeExpression(attr: Node): Node | null {
  if (!isType(attr, "JSXAttribute")) return null;
  const value = asNode(attr.value);
  if (!value) return null;
  if (isType(value, "StringLiteral")) return value;
  if (isType(value, "JSXExpressionContainer")) {
    const expression = asNode(value.expression);
    if (expression && !isType(expression, "JSXEmptyExpression")) return expression;
  }
  return null;
}

function classPropertyValue(object: Node): Node | null {
  const properties = object.properties;
  if (!Array.isArray(properties)) return null;
  for (const property of properties) {
    if (!isNode(property)) continue;
    if (!isType(property, "ObjectProperty") || property.computed === true) continue;
    const name = staticKeyName(asNode(property.key));
    if (name && CLASS_PROP_NAMES.has(name)) return asNode(property.value);
  }
  return null;
}

type SiteExpression = { expression: Node; component?: string };

function collectExpressions(program: Node, functions: Set<string>): SiteExpression[] {
  const expressions: SiteExpression[] = [];

  walk(program, (node) => {
    if (isType(node, "JSXOpeningElement")) {
      const component = jsxElementName(asNode(node.name)) ?? undefined;
      const attributes = node.attributes;
      if (!Array.isArray(attributes)) return;
      for (const attr of attributes) {
        if (!isNode(attr)) continue;
        if (isType(attr, "JSXAttribute")) {
          const attrName = asNode(attr.name);
          const name =
            attrName && isType(attrName, "JSXIdentifier") && typeof attrName.name === "string"
              ? (attrName.name as string)
              : null;
          if (!name || !CLASS_PROP_NAMES.has(name)) continue;
          const expression = attributeExpression(attr);
          if (expression) expressions.push({ expression, component });
          continue;
        }

        if (isType(attr, "JSXSpreadAttribute")) {
          const argument = asNode(attr.argument);
          if (argument && isType(argument, "ObjectExpression")) {
            const expression = classPropertyValue(argument);
            if (expression) expressions.push({ expression, component });
          }
        }
      }
      return;
    }

    if (isType(node, "ObjectProperty") && node.computed !== true) {
      const name = staticKeyName(asNode(node.key));
      if (name && CLASS_PROP_NAMES.has(name)) {
        const value = asNode(node.value);
        if (value) expressions.push({ expression: value });
      }
      return;
    }

    if (isType(node, "CallExpression")) {
      const callee = asNode(node.callee);
      const calleeName =
        callee && isType(callee, "Identifier") && typeof callee.name === "string"
          ? (callee.name as string)
          : null;
      if (calleeName && functions.has(calleeName)) {
        const args = node.arguments;
        if (!Array.isArray(args)) return;
        for (const argument of args) {
          if (isNode(argument) && !isType(argument, "ArgumentPlaceholder")) {
            expressions.push({ expression: argument });
          }
        }
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

  const bindings = new Map<string, Node>();
  walk(program, (node) => {
    if (isType(node, "VariableDeclarator")) {
      const id = asNode(node.id);
      const init = asNode(node.init);
      if (id && isType(id, "Identifier") && typeof id.name === "string" && init) {
        bindings.set(id.name as string, init);
      }
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
