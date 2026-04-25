import { parentPort, workerData } from "node:worker_threads";

import { createValidationState, validateCandidate } from "../adapters/tailwind-language-service.js";

import type { Diagnostic } from "../types.js";
import type { RuleId } from "./rules.js";

const { cssEntry, rules } = workerData as { cssEntry: string; rules: RuleId[] };

try {
  const { state } = await createValidationState(cssEntry);

  parentPort!.on("message", async (candidates: Array<{ file: string; text: string }>) => {
    const results = await Promise.all(
      candidates.map(async (candidate) => {
        try {
          return await validateCandidate(state, candidate, rules);
        } catch {
          process.stderr.write(`tw: skipping ${candidate.file} (language service error)\n`);
          return [] as Diagnostic[];
        }
      }),
    );
    parentPort!.postMessage(results.flat());
  });
} catch (err) {
  process.stderr.write(
    `tw: validation worker failed to initialize: ${err instanceof Error ? err.message : err}\n`,
  );
  parentPort!.postMessage([]);
}
