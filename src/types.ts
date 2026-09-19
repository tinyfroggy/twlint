export type DiagnosticFix = {
  range: [number, number];
  text: string;
};

export type Diagnostic = {
  file: string;
  line: number;
  column: number;
  rule: string;
  severity: "error" | "warning";
  message: string;
  source: string;
  /** Machine-applicable replacement, when the rule can compute one. */
  fix?: DiagnosticFix;
  /** Alternative replacements for the same range. */
  suggestions?: string[];
};

export type SkippedRule = {
  id: string;
  severity: "warn" | "error";
  reason: string;
};

export type LintResult = {
  matchedFiles: number;
  scannedFiles: number;
  elapsedMilliseconds: number;
  diagnostics: Diagnostic[];
  /** Rules that could not run, with the reason (e.g. missing design system). */
  skippedRules: SkippedRule[];
  /** Rule ids that produced diagnostics. */
  ranRules: string[];
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
