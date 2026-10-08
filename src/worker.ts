import { drainOnce } from "./dead_letter.js";

drainOnce().then(results => console.log(JSON.stringify({ processed: results.length, results }, null, 2))).catch(error => { console.error(error); process.exitCode = 1; });
