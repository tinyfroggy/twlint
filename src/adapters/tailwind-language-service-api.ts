import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const languageService = require("@tailwindcss/language-service");

export const { createState, doValidate, getDefaultTailwindSettings } = languageService as {
  createState: (state: unknown) => any;
  doValidate: (state: any, document: unknown, kinds: string[]) => Promise<any>;
  getDefaultTailwindSettings: () => any;
};
