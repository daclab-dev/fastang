#!/usr/bin/env node
import { main } from '../dist/cli.js';
try { await main(); }
catch (error) {
  console.error(`create-fastang: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
}
