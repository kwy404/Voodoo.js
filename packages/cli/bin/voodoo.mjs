#!/usr/bin/env node
/**
 * Voodoo.js command-line interface.
 *
 *   npx voodoojs-cli init [folder]     creates a new ready-to-use project
 *   npx voodoojs-cli build             builds a custom bundle with the modules you choose
 *   npx voodoojs-cli add <component>   copies a component into your project
 *   npx voodoojs-cli info              shows what is installed and the size of each module
 *
 * This file only checks the Node version and hands over to `lib/cli.mjs`. The
 * check has to come first and has to be written in syntax any old Node parses:
 * a static import of the real CLI would be resolved before a single line here
 * ran, and an unsupported Node would die on a missing built-in module instead
 * of reading which version to install.
 *
 * Keep this file LF only. A CRLF checkout turns the shebang into `node\r`,
 * which no Linux or macOS machine can find; `packages/cli/.gitattributes` pins
 * it and a test checks the bytes.
 */

import { readFileSync } from 'node:fs';
import { nodeProblem } from '../lib/engine.mjs';

const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const problem = nodeProblem(process.versions.node, manifest.engines && manifest.engines.node);

if (problem) {
  console.error(problem);
  process.exitCode = 1;
} else {
  import('../lib/cli.mjs')
    .then(({ main }) => main(process.argv.slice(2)))
    .then(
      (code) => {
        process.exitCode = code;
      },
      (error) => {
        console.error(error && error.stack ? error.stack : String(error));
        process.exitCode = 1;
      }
    );
}
