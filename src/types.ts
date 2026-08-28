export type Diagnostic = {
  file: string;
  line: number;
  column: number;
  rule: string;
  severity: "warning";
  message: string;
  source: string;
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
