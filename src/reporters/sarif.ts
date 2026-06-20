import type { Diagnostic, LintResult } from "../types.js";

const SARIF_SCHEMA =
  "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json";
const TOOL_NAME = "twlinter";
const INFORMATION_URI = "https://github.com/tinyfroggy/twlint";

function severityToLevel(severity: Diagnostic["severity"]): "warning" | "error" {
  return severity === "error" ? "error" : "warning";
}

export function renderSarif(result: LintResult): string {
  const ruleIds = [...new Set(result.diagnostics.map((d) => d.rule))].sort();

  const rules = ruleIds.map((id) => ({
    id,
    name: id,
  }));

  const results = result.diagnostics.map((d: Diagnostic) => ({
    ruleId: d.rule,
    level: severityToLevel(d.severity),
    message: { text: d.message },
    locations: [
      {
        physicalLocation: {
          artifactLocation: { uri: d.file },
          region: {
            startLine: d.line,
            startColumn: d.column,
          },
        },
      },
    ],
  }));

  const sarif = {
    $schema: SARIF_SCHEMA,
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: TOOL_NAME,
            informationUri: INFORMATION_URI,
            rules,
          },
        },
        results,
      },
    ],
  };

  return JSON.stringify(sarif, null, 2);
}
