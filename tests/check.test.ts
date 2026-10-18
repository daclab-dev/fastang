import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { checkRoutes } from '../packages/core/src/check.ts';
const run = promisify(execFile);
const bin = resolve('packages/core/bin/fastang.mjs');
async function fixture(work: (root: string, put: (file: string, source: string) => Promise<void>) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), 'fastang-check-'));
  const put = async (file: string, source: string) => { await mkdir(resolve(root, file, '..'), {recursive:true}); await writeFile(join(root,file),source); };
  try {
    await mkdir(join(root,'node_modules/@fastang'),{recursive:true});
    await symlink(resolve('packages/core'),join(root,'node_modules/@fastang/core'),'dir');
    await put('tsconfig.base.json',JSON.stringify({compilerOptions:{target:'ES2022',module:'ESNext',moduleResolution:'Bundler',paths:{'@shared/*':['./src/shared/*']},strict:true}}));
    await put('tsconfig.node.json',JSON.stringify({extends:'./tsconfig.base.json',include:['src/**/*.ts']}));
    await put('src/shared/contracts.ts',`import {defineApiContract as define} from '@fastang/core/contracts';
throw new Error('Application code must not execute');
const path='/api/greet/:name' as const; const method='GET' as const;
const base={method,path}; export const greeting=define({...base,schema:{}});`);
    await put('src/shared/index.ts',`export {greeting as hello} from './contracts';`);
    await put('src/server/api/greet/[name].get.ts',`import * as routing from '@fastang/core/contract-route'; import {hello} from '@shared/index';
const route=routing.defineContractRoute(hello,{handler:async()=>({})}); export {route as default};`);
    await work(root,put);
  } finally { await rm(root,{recursive:true,force:true}); }
}
test('static checks follow tsconfig extends, paths, namespace imports, re-exports, const aliases and spreads without execution',async()=>{
  await fixture(async root=>{const report=await checkRoutes({root});assert.equal(report.verified,1);assert.deepEqual(report.diagnostics,[]);assert.equal(report.project,'tsconfig.node.json');});
});
test('method and parameter-name mismatch includes route and contract locations; unused contracts are ignored',async()=>{
 await fixture(async(root,put)=>{
  await put('src/shared/unused.ts',`import {defineApiContract} from '@fastang/core/contracts';export const unused=defineApiContract({method:'GET',path:'/api/not-local',schema:{}});`);
  await put('src/server/api/greet/[name].get.ts',`import {defineContractRoute} from '@fastang/core/contract-route';import {defineApiContract} from '@fastang/core/contracts';const contract=defineApiContract({method:'POST',path:'/api/greet/:other',schema:{}});export default defineContractRoute(contract,{handler:async()=>({})});`);
  const report=await checkRoutes({root});assert.equal(report.diagnostics.length,1);const d=report.diagnostics[0];assert.equal(d.code,'FA1002');assert.equal(d.file,'src/server/api/greet/[name].get.ts');assert.ok(d.contract?.line);assert.match(d.message,/GET \/api\/greet\/:name, contract POST \/api\/greet\/:other/);
  await put('fastang.config.ts',`throw new Error('CONFIG_EXECUTED');`);
  await assert.rejects(run(process.execPath,[bin,'check','--json'],{cwd:root}),error=>{const e=error as Error&{code:number;stdout:string;stderr:string};assert.equal(e.code,1);assert.ok(e.stdout,JSON.stringify(error));assert.equal(JSON.parse(e.stdout).diagnostics[0].code,'FA1002');return true;});
  await assert.rejects(run(process.execPath,[bin,'build'],{cwd:root}),error=>{assert.match(String((error as {stderr:string}).stderr),/route check failed/);assert.doesNotMatch(String(error),/CONFIG_EXECUTED/);return true;});
 });
});
test('dynamic contracts, unknown wrappers and cycles report unverified; strict makes them CI failures',async()=>{
 await fixture(async(root,put)=>{
  for(const source of [
   `import {defineContractRoute} from '@fastang/core/contract-route';declare function getContract():any;export default defineContractRoute(getContract(),{handler:async()=>({})});`,
   `const contract:any=contract;export default contract;`,
   `function defineContractRoute(a:any,b:any){return a;} export default defineContractRoute({},{});`,
   `import {defineContractRoute} from '@fastang/core/contract-route';import {defineApiContract} from '@fastang/core/contracts';let path='/api/greet/:name';export default defineContractRoute(defineApiContract({method:'GET',path,schema:{}}),{handler:async()=>({})});`
  ]){await put('src/server/api/greet/[name].get.ts',source);const report=await checkRoutes({root});assert.equal(report.verified,0);assert.equal(report.diagnostics[0].code,'FA1003');assert.equal(report.diagnostics[0].severity,'warning');assert.equal((await checkRoutes({root,strict:true})).diagnostics[0].severity,'error');}
 });
});
test('explicit project config, plain routes, syntax/config errors and unknown spreads are handled honestly',async()=>{
 await fixture(async(root,put)=>{
  await put('custom.json',JSON.stringify({extends:'./tsconfig.node.json'}));assert.equal((await checkRoutes({root,project:'custom.json'})).verified,1);
  await put('src/server/api/greet/[name].get.ts',`import {defineApiRoute} from '@fastang/core/api';export default defineApiRoute({handler:async()=>({})});`);
  assert.deepEqual((await checkRoutes({root})).diagnostics,[]);
  await put('src/server/api/greet/[name].get.ts',`import {defineContractRoute} from '@fastang/core/contract-route';import {defineApiContract} from '@fastang/core/contracts';declare const unknown:any;export default defineContractRoute(defineApiContract({method:'GET',path:'/api/greet/:name',...unknown,schema:{}}),{handler:async()=>({})});`);
  assert.equal((await checkRoutes({root})).diagnostics[0].code,'FA1003');
  await put('src/server/api/greet/[name].get.ts',`import {defineContractRoute} from '@fastang/core/contract-route';import {defineApiContract} from '@fastang/core/contracts';declare const dynamic:any;export default defineContractRoute(defineApiContract({method:'GET',path:'/api/greet/:name',...{path:dynamic},schema:{}}),{handler:async()=>({})});`);
  assert.equal((await checkRoutes({root})).diagnostics[0].code,'FA1003');
  await put('src/server/api/greet/[name].get.ts',`export default (`);assert.ok((await checkRoutes({root})).diagnostics.some(d=>d.code==='FA1000'));
  await put('tsconfig.node.json','{ invalid');assert.equal((await checkRoutes({root})).diagnostics[0].code,'FA1000');
 });
});
test('Vite shares diagnostics and recovers after contract edits',async()=>{
 const {EventEmitter}=await import('node:events');
 const {fastang}=await import('../packages/core/src/vite-plugin.ts');
 await fixture(async(root,put)=>{
  await mkdir(join(root,'src/app/pages'),{recursive:true});
  const watcher=Object.assign(new EventEmitter(),{add:(_files:unknown)=>{}});
  const messages: {type:string;err?:{message:string}}[]=[];
  let receive:((message:{type:string;err?:{message:string}})=>void)|undefined;
  const plugin=fastang();
  const configResolved=plugin.configResolved as (config:unknown)=>void;
  configResolved({root});
  const configure=plugin.configureServer as (server:unknown)=>void;
  configure({watcher,config:{logger:{error:()=>{},warn:()=>{}}},ws:{send:(message:{type:string;err?:{message:string}})=>{messages.push(message);receive?.(message);}}});
  const event=()=>new Promise<{type:string;err?:{message:string}}>((resolveRun,reject)=>{const timeout=setTimeout(()=>reject(new Error('No Vite diagnostic')),10000);receive=message=>{clearTimeout(timeout);receive=undefined;resolveRun(message);};});
  try{
   await put('src/shared/contracts.ts',`import {defineApiContract} from '@fastang/core/contracts';export const greeting=defineApiContract({method:'GET',path:'/api/wrong',schema:{}});`);
   let next=event();watcher.emit('change',join(root,'src/shared/contracts.ts'));const failure=await next;assert.equal(failure.type,'error');assert.match(failure.err!.message,/FA1002/);
   await put('src/shared/contracts.ts',`import {defineApiContract} from '@fastang/core/contracts';export const greeting=defineApiContract({method:'GET',path:'/api/greet/:name',schema:{}});`);
   next=event();watcher.emit('change',join(root,'src/shared/contracts.ts'));assert.equal((await next).type,'full-reload');assert.match(await readFile(join(root,'.fastang/api.ts'),'utf8'),/\/api\/greet\/:name/);assert.equal(messages.length,2);
  }finally{watcher.emit('close');}
 });
});
