import { parentPort, workerData } from "node:worker_threads";

import {
  createValidationState,
  validateCandidateWithResult,
} from "../adapters/tailwind-language-service.js";

import type { TailwindProject } from "../discovery/resolve-tailwind-project.js";
import type { Diagnostic, SkippedRule } from "../types.js";
import type { TwlinterConfig } from "../rules/config.js";

const { project, config } = workerData as {
  project: TailwindProject;
  config?: TwlinterConfig;
};

type WorkerResult = {
  diagnostics: Diagnostic[];
  ran: string[];
  skipped: SkippedRule[];
};

try {
  const { state, designSystem, dependencyPaths, theme } = await createValidationState(project);

  parentPort!.on("message", async (candidates: Array<{ file: string; text: string }>) => {
    const diagnostics: Diagnostic[] = [];
    const ran = new Set<string>();
    const skipped = new Map<string, SkippedRule>();

    await Promise.all(
      candidates.map(async (candidate) => {
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
          process.stderr.write(`tw: skipping ${candidate.file} (language service error)\n`);
        }
      }),
    );

    const result: WorkerResult = {
      diagnostics,
      ran: [...ran],
      skipped: [...skipped.values()],
    };
    parentPort!.postMessage(result);
  });
} catch (err) {
  process.stderr.write(
    `tw: validation worker failed to initialize: ${err instanceof Error ? err.message : err}\n`,
  );
  parentPort!.postMessage({ diagnostics: [], ran: [], skipped: [] } satisfies WorkerResult);
}
