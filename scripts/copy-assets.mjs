import { chmodSync, cpSync } from 'node:fs';
import { resolve } from 'node:path';

cpSync(resolve('src/styles.css'), resolve('dist/styles.css'));
cpSync(resolve('scripts/admin-kit-conformance.mjs'), resolve('dist/admin-kit-conformance.mjs'));
chmodSync(resolve('dist/admin-kit-conformance.mjs'), 0o755);
