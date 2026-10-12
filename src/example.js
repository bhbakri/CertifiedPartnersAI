import { buildBrief } from './selection.js';
console.log(JSON.stringify(buildBrief(process.argv[2] || 'CASE-001'), null, 2));
