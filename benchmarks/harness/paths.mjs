/**
 * @module benchmarks/harness/paths
 * Caminhos absolutos do repositorio, resolvidos a partir deste arquivo.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export const benchRoot = path.resolve(here, '..');
export const repoRoot = path.resolve(benchRoot, '..');
export const pkgRoot = path.join(repoRoot, 'packages', 'voodoojs');
export const srcRoot = path.join(pkgRoot, 'src');
export const distRoot = path.join(pkgRoot, 'dist');
export const buildDir = path.join(benchRoot, '.build');
export const resultsDir = path.join(benchRoot, 'results');
export const reportsDir = path.join(benchRoot, 'reports');
