export type Diagnostic = {
  file: string;
  line: number;
  column: number;
  rule: string;
  severity: "warning" | "error";
  message: string;
  source: string;
};

export type LintOptions = {
  verbose?: boolean;
  config?: string;
  ignorePatterns?: string[];
  classIgnorePatterns?: string[];
  includePatterns?: string[];
  maxFileSize?: number;
  rules?: string[];
  cssEntry?: string;
};

export type LintResult = {
  matchedFiles: number;
  scannedFiles: number;
  elapsedMilliseconds: number;
  diagnostics: Diagnostic[];
  project: ProjectInfo;
};

export type ProjectInfo = {
  rootDirectory: string;
  cssEntryPath: string | null;
  tailwindVersion: string | null;
  supported: boolean;
  sourceExtensions: string[];
  isMonorepo: boolean;
  monorepoTool: "npm" | "pnpm" | "yarn" | "nx" | null;
  workspacePackages: string[];
};

export type CandidateInput = {
  file: string;
  text: string;
};

export type TailwindDiagnostic = {
  message: string;
  range: {
    start: {
      line: number;
      character: number;
    };
  };
  severity?: number;
  code?: string;
};
