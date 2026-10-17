import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Test-only client marker after rendering and Angular's pending tasks settle. */
export async function addBrowserProbe(app: string): Promise<void> {
  const file = join(app, 'src/app/app.ts');
  const source = await readFile(file, 'utf8');
  assert.ok(source.includes('export class App {}'), 'Update the test probe for the starter root component');
  await writeFile(file, `import { ApplicationRef, afterNextRender, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
` + source.replace('export class App {}', `export class App {
  constructor() {
    const document = inject(DOCUMENT);
    const application = inject(ApplicationRef);
    afterNextRender(() => {
      void application.whenStable().then(() => document.documentElement.setAttribute('data-fastang-test-ready', 'true'));
    });
  }
}`));
}
