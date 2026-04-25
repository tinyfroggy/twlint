import { readFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { Worker } from "node:worker_threads";
import os from "node:os";

import { createValidationState, validateCandidate } from "../adapters/tailwind-language-service.js";
import { discoverProject } from "../discovery/discover-project.js";
import { mightContainTailwindClasses } from "../discovery/file-relevance.js";
import { resolveCssEntry } from "../discovery/resolve-css-entry.js";
import { resolveProjectInputFiles } from "../discovery/resolve-inputs.js";
import { DEFAULT_RULES, type RuleId } from "./rules.js";

import type { CandidateInput, Diagnostic, LintOptions, LintResult } from "../types.js";
import { MAX_FILE_SIZE_BYTES } from "../constants.js";

export async function lintProject(
  patterns: string[],
  options: LintOptions = {},
): Promise<LintResult> {
  const startedAt = performance.now();
  const ignorePatterns = options.ignorePatterns ?? [];
  const classIgnorePatterns = options.classIgnorePatterns ?? [];
  const rules = options.rules as RuleId[] | undefined;
  const maxFileSize = options.maxFileSize ?? MAX_FILE_SIZE_BYTES;
  const entries = await resolveProjectInputFiles(patterns, ignorePatterns);

  if (entries.length === 0) {
    return {
      matchedFiles: 0,
      scannedFiles: 0,
      elapsedMilliseconds: performance.now() - startedAt,
      diagnostics: [],
      project: await discoverProject(null),
    };
  }

  const cssEntry = options.cssEntry ?? (await resolveCssEntry());
  const project = await discoverProject(cssEntry);
  const candidates = await collectCandidateInputs(entries, maxFileSize);
  let diagnostics = await validateCandidates(cssEntry, candidates, rules);

  if (classIgnorePatterns.length > 0) {
    diagnostics = filterIgnoredClasses(diagnostics, classIgnorePatterns);
  }

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
  rules?: RuleId[],
) {
  try {
    return await validateCandidate(state, candidate, rules);
  } catch {
    process.stderr.write(`tw: skipping ${candidate.file} (language service error)\n`);
    return [];
  }
}

async function collectCandidateInputs(
  files: string[],
  maxFileSize: number,
): Promise<CandidateInput[]> {
  const candidates = await Promise.all(
    files.map(async (file) => {
      let text: string;
      try {
        text = await readFile(file, "utf8");
      } catch {
        return null;
      }

      if (text.length > maxFileSize) return null;
      if (!mightContainTailwindClasses(file, text)) return null;

      return { file, text };
    }),
  );

  return candidates.filter((candidate): candidate is CandidateInput => candidate !== null);
}

async function validateCandidates(
  cssEntry: string,
  candidates: CandidateInput[],
  rules?: RuleId[],
): Promise<Diagnostic[]> {
  const numWorkers = Math.min(
    os.availableParallelism?.() ?? os.cpus().length,
    4,
    Math.max(1, candidates.length),
  );

  if (numWorkers <= 1) {
    const { state } = await createValidationState(cssEntry);
    return (await Promise.all(candidates.map((c) => safeValidate(state, c, rules)))).flat();
  }

  const chunks = distributeArray(candidates, numWorkers);

  const results = await Promise.all(
    chunks.map(async (chunk) => {
      const worker = new Worker(new URL("./validation-worker.js", import.meta.url), {
        workerData: { cssEntry, rules: rules ?? DEFAULT_RULES },
      });

      const result = await new Promise<Diagnostic[]>((resolve) => {
        worker.on("message", resolve);
        worker.on("error", () => resolve([]));
        worker.postMessage(chunk);
      });

      await worker.terminate();
      return result;
    }),
  );

  return results.flat();
}

function filterIgnoredClasses(diagnostics: Diagnostic[], patterns: string[]): Diagnostic[] {
  const regexps = patterns.map((p) => new RegExp(p));
  return diagnostics.filter((d) => {
    const match = d.message.match(/`([^`]+)`/);
    if (!match) return true;
    return !regexps.some((r) => r.test(match[1]));
  });
}

function distributeArray<T>(array: T[], n: number): T[][] {
  const chunks: T[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < array.length; i++) {
    chunks[i % n].push(array[i]);
  }
  return chunks;
}
