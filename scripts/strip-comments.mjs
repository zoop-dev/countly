import fs from 'node:fs';
import { stripContent } from './strip-lib.mjs';

const input = fs.readFileSync(0, 'utf8');
process.stdout.write(stripContent(process.argv[2] || '', input));
