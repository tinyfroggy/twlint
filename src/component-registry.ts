import type { ComponentInfo } from "./config/types.js";
import { shadcnPreset, flatAliasPreset } from "./presets/shadcn.js";

export type ComponentRegistry = Record<string, ComponentInfo>;

let registry: Record<string, ComponentInfo> = {};
let strictMode = false;

export function createComponentRegistry(components?: ComponentRegistry): ComponentRegistry {
  return { ...shadcnPreset, ...flatAliasPreset, ...components };
}

export function initRegistry(components?: Record<string, ComponentInfo>, strict?: boolean): void {
  registry = createComponentRegistry(components);
  if (strict !== undefined) {
    strictMode = strict;
  }
}

export function getComponentInfo(tagName: string): ComponentInfo | undefined {
  return registry[tagName];
}

export function getComponentRegistry(): ComponentRegistry {
  return registry;
}

export function isComponentElement(tagName: string): boolean {
  return /^[A-Z]/.test(tagName) || tagName.includes(".");
}

export function getStrictMode(): boolean {
  return strictMode;
}
