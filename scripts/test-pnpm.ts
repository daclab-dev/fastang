import assert from 'node:assert/strict';
import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,readFile,writeFile,mkdir,rm,cp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const run=promisify(execFile), repository=process.cwd();
const temporary=await mkdtemp(join(tmpdir(),'fastang-pnpm-'));
const windows=process.platform==='win32';
const pnpm=async(args:string[],cwd=temporary)=>{
 console.log(`pnpm: ${args.join(' ')}`);
 try{return await run(windows?'pnpm.cmd':'pnpm',args,{cwd,shell:windows,timeout:180000,maxBuffer:8*1024*1024});}
 catch(error){console.error((error as {stdout?:string;stderr?:string}).stdout,(error as {stderr?:string}).stderr);throw error;}
};
try{
 const version=(await pnpm(['--version'])).stdout.trim();assert.match(version,/^(10|11)\./);
 const packs:Record<string,string>={};
 for(const name of ['@fastang/core','create-fastang','@fastang/cli']){const result=JSON.parse((await run('npm',['pack','--workspace',name,'--pack-destination',temporary,'--json'],{cwd:repository,maxBuffer:4*1024*1024})).stdout);packs[name]=join(temporary,(Array.isArray(result)?result[0]:result[name]).filename);}
 const tools=join(temporary,'tools');await mkdir(tools);await writeFile(join(tools,'package.json'),'{"name":"pnpm-tools","private":true}');
 await pnpm(['add',packs['create-fastang'],packs['@fastang/cli']],tools);
 await pnpm(['exec','create-fastang','../app','--package-manager','pnpm','--core-package',packs['@fastang/core'],'--install'],tools);
 const app=join(temporary,'app');let manifest=JSON.parse(await readFile(join(app,'package.json'),'utf8'));assert.match(manifest.packageManager,/^pnpm@/);assert.match(manifest.scripts.build,/^pnpm run check/);
 await assert.rejects(readFile(join(app,'package-lock.json')),{code:'ENOENT'});
 await pnpm(['install','--frozen-lockfile'],app);await pnpm(['run','build'],app);
 const {createProductionServer}=await import(pathToFileURL(join(app,'dist/server/index.js')).href);const server=await createProductionServer();try{assert.equal((await server.inject('/api/health')).json().ok,true);assert.match((await server.inject('/greet/pnpm')).body,/Hello, pnpm!/);}finally{await server.close();}
 // Exercise the actual development command with an ephemeral port.
 const dev=spawn(windows?'pnpm.cmd':'pnpm',['run','dev'],{cwd:app,shell:windows,detached:!windows,env:{...process.env,PORT:'0',HOST:'127.0.0.1'},stdio:['ignore','pipe','pipe']});
 let logs='';dev.stdout?.on('data',chunk=>{logs+=String(chunk);});dev.stderr?.on('data',chunk=>{logs+=String(chunk);});
 const finished=new Promise<void>((resolveRun,reject)=>{dev.once('error',reject);dev.once('exit',()=>resolveRun());});
 try{
  const deadline=Date.now()+30000;let address:string|undefined;
  while(!address){address=logs.match(/Server listening at (http:\/\/127\.0\.0\.1:\d+)/)?.[1];if(address)break;if(dev.exitCode!==null||Date.now()>deadline)throw new Error('pnpm dev failed: '+logs);await new Promise(resolveRun=>setTimeout(resolveRun,100));}
  assert.equal((await fetch(address+'/api/health')).status,200);assert.match(await (await fetch(address+'/greet/pnpm')).text(),/Hello, pnpm!/);assert.doesNotMatch(logs,/incoming request|request completed|FastAng routes:/);
 }finally{
  if(dev.exitCode===null&&dev.signalCode===null){if(!windows&&dev.pid)process.kill(-dev.pid,'SIGTERM');else dev.kill('SIGTERM');}
  await finished;
 }
 // Upgrade a registry installation, preserving application code and the pnpm lockfile.
 await pnpm(['add','--save-exact','@fastang/core@0.1.0-alpha.3'],app);
 const custom=join(app,'src/server/api/greet/[name].get.ts');await writeFile(custom,(await readFile(custom,'utf8')).replace('Hello,','Welcome,'));const before=await readFile(custom,'utf8');const lock=await readFile(join(app,'pnpm-lock.yaml'),'utf8');
 const cli=join(tools,'node_modules/@fastang/cli/bin/fastang.mjs');
 const update=async(args:string[])=>{try{return await run(process.execPath,[cli,'update',...args],{cwd:app,timeout:180000,maxBuffer:8*1024*1024});}catch(error){console.error((error as {stdout?:string}).stdout,(error as {stderr?:string}).stderr);throw error;}};
 const plan=await update(['--to','0.1.0-alpha.4']);assert.match(plan.stdout,/Package manager: pnpm/);assert.equal(await readFile(join(app,'pnpm-lock.yaml'),'utf8'),lock);
 await update(['--to','0.1.0-alpha.4','--yes']);assert.equal(await readFile(custom,'utf8'),before);manifest=JSON.parse(await readFile(join(app,'package.json'),'utf8'));assert.equal(manifest.dependencies['@fastang/core'],'0.1.0-alpha.4');await pnpm(['install','--frozen-lockfile'],app);await pnpm(['run','build'],app);
 // Restore the source-built core for adapter checks if this checkout has unreleased fixes.
 await pnpm(['add','--save-exact',packs['@fastang/core']],app);
 await pnpm(['run','build:vercel'],app);
 const planVercel=JSON.parse(await readFile(join(app,'dist/vercel-manifest.json'),'utf8'));const greeting=planVercel.functions.find((fn:{paths:string[]})=>fn.paths.includes('/greet/:name'));assert.ok(greeting);
 const isolated=join(temporary,'isolated');await cp(join(app,'.vercel/output/functions',greeting.name+'.func'),isolated,{recursive:true,verbatimSymlinks:true});const config=JSON.parse(await readFile(join(isolated,'.vc-config.json'),'utf8'));const {default:handler}=await import(pathToFileURL(join(isolated,config.handler)).href);const {default:inject}=await import('light-my-request');const response=await inject(handler,'/greet/pnpm');assert.equal(response.statusCode,200);assert.match(response.body,/Welcome, pnpm!/);
 console.log(`pnpm ${version}: generation, frozen install, SSR/API, dev server, update plan/apply, source preservation and isolated Vercel function passed.`);
}finally{await rm(temporary,{recursive:true,force:true});}
