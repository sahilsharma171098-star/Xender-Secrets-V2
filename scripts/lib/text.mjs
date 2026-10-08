import fs from 'node:fs';

// Text comparisons should describe content, regardless of checkout line endings.
export const readText = (file) => fs.readFileSync(file, 'utf8').replace(/\r\n?/g, '\n');
