import { stat, readFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";

import { createValidationState, validateCandidate } from "../adapters/tailwind-language-service.js";
import { discoverProject } from "../discovery/discover-project.js";
import { mightContainTailwindClasses } from "../discovery/file-relevance.js";
import { resolveCssEntry } from "../discovery/resolve-css-entry.js";
import { resolveProjectInputFiles } from "../discovery/resolve-inputs.js";

import type { CandidateInput, LintResult } from "../types.js";
import { MAX_FILE_SIZE_BYTES } from "../constants.js";

export async function lintProject(
  patterns: string[],
  _options: { verbose?: boolean } = {},
): Promise<LintResult> {
  const startedAt = performance.now();
  const entries = await resolveProjectInputFiles(patterns);

  if (entries.length === 0) {
    return {
      matchedFiles: 0,
      scannedFiles: 0,
      elapsedMilliseconds: performance.now() - startedAt,
      diagnostics: [],
      project: await discoverProject(null),
    };
  }

  const cssEntry = await resolveCssEntry();
  const project = await discoverProject(cssEntry);
  const { state } = await createValidationState(cssEntry);
  const candidates = await collectCandidateInputs(entries);
  const validated = await Promise.all(
    candidates.map((candidate) => safeValidate(state, candidate)),
  );

  const diagnostics = validated.flat();

  diagnostics.sort((a, b) => {
    return a.file.localeCompare(b.file) || a.line - b.line || a.column - b.column;
  });

  return {
    matchedFiles: entries.length,
    scannedFiles: candidates.length,
    elapsedMilliseconds: performance.now() - startedAt,
    diagnostics,
    project,
  };
}

async function safeValidate(
  state: Awaited<ReturnType<typeof createValidationState>>["state"],
  candidate: CandidateInput,
) {
  try {
    return await validateCandidate(state, candidate);
  } catch {
    process.stderr.write(`tw: skipping ${candidate.file} (language service error)\n`);
    return [];
  }
}

async function collectCandidateInputs(files: string[]): Promise<CandidateInput[]> {
  const candidates = await Promise.all(
    files.map(async (file) => {
      let text: string;
      try {
        const info = await stat(file);
        if (info.size > MAX_FILE_SIZE_BYTES) return null;
        text = await readFile(file, "utf8");
      } catch {
        return null;
      }

      if (!mightContainTailwindClasses(file, text)) {
        return null;
      }

      return { file, text };
    }),
  );

  return candidates.filter((candidate): candidate is CandidateInput => candidate !== null);
}
