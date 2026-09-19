export type DiagnosticFix = {
  range: [number, number];
  text: string;
};

export type Diagnostic = {
  file: string;
  line: number;
  column: number;
  rule: string;
  severity: "warning";
  message: string;
  source: string;
  /** Machine-applicable replacement, when the rule can compute one. */
  fix?: DiagnosticFix;
  /** Alternative replacements for the same range. */
  suggestions?: string[];
};

export type LintResult = {
  matchedFiles: number;
  scannedFiles: number;
  elapsedMilliseconds: number;
  diagnostics: Diagnostic[];
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
  code?: string;
};
