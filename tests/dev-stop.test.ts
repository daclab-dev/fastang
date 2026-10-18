import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { stopChild } from '../packages/core/src/commands/stop-child.ts';

test('development shutdown forces a child ignoring SIGTERM and releases the supervisor', { skip: process.platform === 'win32', timeout: 5000 }, async () => {
  const child = spawn(process.execPath, ['-e', "process.on('SIGTERM',()=>{}); console.log('ready'); setInterval(()=>{},1000)"], { stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    await once(child.stdout!, 'data');
    const warnings: string[] = [];
    await stopChild(child, 100, message => warnings.push(message));
    assert.equal(child.signalCode, 'SIGKILL');
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /forcing termination/);
    await stopChild(child, 100, () => assert.fail('Already exited'));
  } finally { child.kill('SIGKILL'); }
});

test('development shutdown allows graceful application hooks without warnings', { timeout: 5000 }, async () => {
  const child = spawn(process.execPath, ['-e', "process.on('SIGTERM',()=>process.exit(0)); console.log('ready'); setInterval(()=>{},1000)"], { stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    await once(child.stdout!, 'data');
    await stopChild(child, 1000, () => assert.fail('Graceful shutdown should not time out'));
  } finally { child.kill('SIGKILL'); }
});
