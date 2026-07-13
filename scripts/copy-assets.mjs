import { cpSync } from 'node:fs';
import { resolve } from 'node:path';

cpSync(resolve('src/styles.css'), resolve('dist/styles.css'));
