import { readFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { Worker } from "node:worker_threads";
import os from "node:os";

import {
  createValidationState,
  validateCandidateWithResult,
} from "../adapters/tailwind-language-service.js";
import { applyFixes } from "./apply-fixes.js";
import { mightContainTailwindClasses } from "../discovery/file-relevance.js";
import { resolveTailwindProject } from "../discovery/resolve-tailwind-project.js";
import { resolveProjectInputFiles } from "../discovery/resolve-inputs.js";

import type { TailwindProject } from "../discovery/resolve-tailwind-project.js";
import type { CandidateInput, Diagnostic, LintResult, SkippedRule } from "../types.js";
import type { TwlinterConfig } from "../rules/config.js";
import { MAX_FILE_SIZE_BYTES } from "../constants.js";

export type LintOptions = {
  /** Apply machine-applicable fixes and re-scan. */
  fix?: boolean;
  /** Rule configuration (on/off, severity, options). */
  config?: TwlinterConfig;
};

type ScanResult = {
  diagnostics: Diagnostic[];
  ran: string[];
  skipped: SkippedRule[];
};

export async function lintProject(options: LintOptions = {}): Promise<LintResult> {
  const startedAt = performance.now();
  const rootDir = process.cwd();
  const config = options.config;
  const entries = await resolveProjectInputFiles(config?.files, config?.ignore);

  if (entries.length === 0) {
    return {
      matchedFiles: 0,
      scannedFiles: 0,
      elapsedMilliseconds: performance.now() - startedAt,
      diagnostics: [],
      skippedRules: [],
      ranRules: [],
    };
  }

  const project = await resolveTailwindProject(rootDir);
  let candidates = await collectCandidateInputs(entries);
  let scan = await validateCandidates(project, candidates, config);

  if (options.fix && (await applyFixes(scan.diagnostics)) > 0) {
    candidates = await collectCandidateInputs(entries);
    scan = await validateCandidates(project, candidates, config);
  }

  scan.diagnostics.sort((a, b) => {
    return a.file.localeCompare(b.file) || a.line - b.line || a.column - b.column;
  });

  return {
    matchedFiles: entries.length,
    scannedFiles: candidates.length,
    elapsedMilliseconds: performance.now() - startedAt,
    diagnostics: scan.diagnostics,
    skippedRules: scan.skipped,
    ranRules: scan.ran,
  };
}

async function validateCandidates(
  project: TailwindProject,
  candidates: CandidateInput[],
  config?: TwlinterConfig,
): Promise<ScanResult> {
  const numWorkers = Math.min(
    os.availableParallelism?.() ?? os.cpus().length,
    4,
    Math.min(4, candidates.length),
  );

  if (numWorkers <= 1) {
    const { state, designSystem, dependencyPaths, theme } = await createValidationState(project);
    const diagnostics: Diagnostic[] = [];
    const ran = new Set<string>();
    const skipped = new Map<string, SkippedRule>();

    for (const candidate of candidates) {
      try {
        const result = await validateCandidateWithResult(
          state,
          designSystem,
          candidate,
          dependencyPaths,
          theme,
          config,
        );
        diagnostics.push(...result.diagnostics);
        for (const id of result.ran) ran.add(id);
        for (const rule of result.skipped) skipped.set(rule.id, rule);
      } catch {
        // A single file failure should not hide the rest.
      }
    }

    return { diagnostics, ran: [...ran], skipped: [...skipped.values()] };
  }

  const chunks = distributeArray(candidates, numWorkers);

  const results = await Promise.all(
    chunks.map(async (chunk) => {
      const worker = new Worker(new URL("./validation-worker.js", import.meta.url), {
        workerData: { project, config },
      });

      const result = await new Promise<ScanResult>((resolve) => {
        worker.on("message", (message: Partial<ScanResult>) =>
          resolve({
            diagnostics: message.diagnostics ?? [],
            ran: message.ran ?? [],
            skipped: message.skipped ?? [],
          }),
        );
        worker.on("error", () => resolve({ diagnostics: [], ran: [], skipped: [] }));
        worker.postMessage(chunk);
      });

      await worker.terminate();
      return result;
    }),
  );

  const diagnostics: Diagnostic[] = [];
  const ran = new Set<string>();
  const skipped = new Map<string, SkippedRule>();

  for (const result of results) {
    diagnostics.push(...result.diagnostics);
    for (const id of result.ran) ran.add(id);
    for (const rule of result.skipped) skipped.set(rule.id, rule);
  }

  return { diagnostics, ran: [...ran], skipped: [...skipped.values()] };
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

function distributeArray<T>(array: T[], n: number): T[][] {
  const chunks: T[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < array.length; i++) {
    chunks[i % n].push(array[i]);
  }
  return chunks;
}
