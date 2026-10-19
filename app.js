const path = require('node:path');

// cPanel Node.js Selector / Passenger startup file. Keep the process rooted at
// the application directory so the authority serves this release's dist/.
process.chdir(__dirname);

if (Number(process.versions.node.split('.')[0]) < 24) {
  throw new Error('Bad at Boating requires Node.js 24 or newer. Select Node 24 in cPanel.');
}

import('./build/server.mjs').catch(error => {
  console.error('Bad at Boating could not start:', error);
  process.exitCode = 1;
});
