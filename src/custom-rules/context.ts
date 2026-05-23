import {
  createComponentRegistry,
  getComponentRegistry,
  getStrictMode,
} from "../component-registry.js";
import type { ComponentInfo } from "../config/types.js";
import type { ElementClassList, ParsedClass } from "./utils.js";
import { parseClassName } from "./utils.js";

export type RuleContext = {
  strict?: boolean;
  components?: Record<string, ComponentInfo>;
  componentRegistry?: Record<string, ComponentInfo>;
};

export type ResolvedElementClasses = {
  tag: string;
  offset: number;
  kind: "native" | "known-component" | "unknown-component";
  confidence: "high" | "low";
  userClasses: ParsedClass[];
  baseClasses: ParsedClass[];
  effectiveClasses: ParsedClass[];
};

export function createRuleContext(options: RuleContext = {}): RuleContext {
  return {
    ...options,
    strict: options.strict ?? false,
    componentRegistry: options.componentRegistry ?? createComponentRegistry(options.components),
  };
}

export function normalizeRuleContext(context?: RuleContext): RuleContext {
  if (context?.componentRegistry) {
    return { ...context, strict: context.strict ?? getStrictMode() };
  }

  if (!context?.components) {
    return {
      strict: context?.strict ?? getStrictMode(),
      componentRegistry: getComponentRegistry(),
    };
  }

  return createRuleContext({
    strict: context?.strict ?? getStrictMode(),
    components: context?.components,
  });
}

export function resolveElementClasses(
  element: ElementClassList,
  context: RuleContext,
): ResolvedElementClasses {
  const userClasses = element.classes.map((className) => parseClassName(className));

  if (!element.isComponent) {
    return {
      tag: element.tag,
      offset: element.offset,
      kind: "native",
      confidence: "high",
      userClasses,
      baseClasses: [],
      effectiveClasses: userClasses,
    };
  }

  const info = context.componentRegistry?.[element.tag];
  if (!info) {
    return {
      tag: element.tag,
      offset: element.offset,
      kind: "unknown-component",
      confidence: "low",
      userClasses,
      baseClasses: [],
      effectiveClasses: userClasses,
    };
  }

  const baseClasses = info.baseClasses
    .split(/\s+/)
    .filter(Boolean)
    .map((className) => parseClassName(className));

  return {
    tag: element.tag,
    offset: element.offset,
    kind: "known-component",
    confidence: "high",
    userClasses,
    baseClasses,
    effectiveClasses: [...baseClasses, ...userClasses],
  };
}

export function hasBaseInScope(
  classes: ParsedClass[],
  targetScope: string,
  bases: Set<string>,
): boolean {
  return classes.some((className) => {
    if (!bases.has(className.base)) return false;
    return className.responsive === "" || className.responsive === targetScope;
  });
}

export function findUserClass(
  classes: ParsedClass[],
  predicate: (className: ParsedClass) => boolean,
): ParsedClass | undefined {
  return classes.find(predicate);
}
