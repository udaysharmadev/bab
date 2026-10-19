import {build} from 'esbuild';
await build({entryPoints:['src/server/index.ts'],outfile:process.env.BOAT_SERVER_OUT??'build/server.mjs',bundle:true,platform:'node',target:'node24',format:'esm',packages:'external',sourcemap:true});
console.log('Production authority bundled.');
