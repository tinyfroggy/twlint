import { readFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { Worker } from "node:worker_threads";
import os from "node:os";

import { createValidationState, validateCandidate } from "../adapters/tailwind-language-service.js";
import { mightContainTailwindClasses } from "../discovery/file-relevance.js";
import { resolveCssEntry } from "../discovery/resolve-css-entry.js";
import { resolveProjectInputFiles } from "../discovery/resolve-inputs.js";

import type { CandidateInput, Diagnostic, LintResult } from "../types.js";
import { MAX_FILE_SIZE_BYTES } from "../constants.js";

export async function lintProject(): Promise<LintResult> {
  const startedAt = performance.now();
  const rootDir = process.cwd();
  const entries = await resolveProjectInputFiles();

  if (entries.length === 0) {
    return {
      matchedFiles: 0,
      scannedFiles: 0,
      elapsedMilliseconds: performance.now() - startedAt,
      diagnostics: [],
    };
  }

  const cssEntry = await resolveCssEntry(rootDir);
  const candidates = await collectCandidateInputs(entries);
  const diagnostics = await validateCandidates(cssEntry, candidates);

  diagnostics.sort((a, b) => {
    return a.file.localeCompare(b.file) || a.line - b.line || a.column - b.column;
  });

  return {
    matchedFiles: entries.length,
    scannedFiles: candidates.length,
    elapsedMilliseconds: performance.now() - startedAt,
    diagnostics,
  };
}

async function safeValidate(
  state: Awaited<ReturnType<typeof createValidationState>>["state"],
  designSystem: unknown,
  candidate: CandidateInput,
) {
  return await validateCandidate(state, designSystem, candidate);
}

async function collectCandidateInputs(files: string[]): Promise<CandidateInput[]> {
  const candidates = await Promise.all(
    files.map(async (file) => {
      let text: string;
      try {
        text = await readFile(file, "utf8");
      } catch {
        return null;
      }

      if (text.length > MAX_FILE_SIZE_BYTES) return null;
      if (!mightContainTailwindClasses(file, text)) return null;

      return { file, text };
    }),
  );

  return candidates.filter((candidate): candidate is CandidateInput => candidate !== null);
}

async function validateCandidates(
  cssEntry: string,
  candidates: CandidateInput[],
): Promise<Diagnostic[]> {
  const numWorkers = Math.min(
    os.availableParallelism?.() ?? os.cpus().length,
    4,
    Math.min(4, candidates.length),
  );

  if (numWorkers <= 1) {
    const { state, designSystem } = await createValidationState(cssEntry);
    return (
      await Promise.all(candidates.map((candidate) => safeValidate(state, designSystem, candidate)))
    ).flat();
  }

  const chunks = distributeArray(candidates, numWorkers);

  const results = await Promise.all(
    chunks.map(async (chunk) => {
      const worker = new Worker(new URL("./validation-worker.js", import.meta.url), {
        workerData: { cssEntry },
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

function distributeArray<T>(array: T[], n: number): T[][] {
  const chunks: T[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < array.length; i++) {
    chunks[i % n].push(array[i]);
  }
  return chunks;
}
