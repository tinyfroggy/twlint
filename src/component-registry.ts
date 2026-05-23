import type { ComponentInfo } from "./config/types.js";
import { shadcnPreset, flatAliasPreset } from "./presets/shadcn.js";

let registry: Record<string, ComponentInfo> = {};
let strictMode = false;

export function initRegistry(components?: Record<string, ComponentInfo>, strict?: boolean): void {
  registry = { ...shadcnPreset, ...flatAliasPreset, ...components };
  if (strict !== undefined) {
    strictMode = strict;
  }
}

export function getComponentInfo(tagName: string): ComponentInfo | undefined {
  return registry[tagName];
}

export function isComponentElement(tagName: string): boolean {
  return /^[A-Z]/.test(tagName);
}

export function getStrictMode(): boolean {
  return strictMode;
}
