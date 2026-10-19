// Passenger loads CommonJS; the prebuilt authority remains ESM.
process.chdir(__dirname);
if (Number(process.versions.node.split('.')[0]) < 24) {
  throw new Error('Bad at Boating requires Node.js 24 or newer. Select Node 24 in your hosting panel.');
}
import('./build/server.mjs').catch(error => {
  console.error('Bad at Boating could not start:', error);
  process.exitCode = 1;
});
