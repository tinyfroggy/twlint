export type ComponentInfo = {
  baseClasses: string;
};

export type TwlinterConfig = {
  include?: string[];
  ignorePatterns?: string[];
  classIgnorePatterns?: string[];
  cssEntry?: string;
  maxFileSize?: number;
  rules?: string[];
  strict?: boolean;
  components?: Record<string, ComponentInfo>;
};
