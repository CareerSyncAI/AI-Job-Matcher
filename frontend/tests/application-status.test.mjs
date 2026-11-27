import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import ts from 'typescript';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const statusSource = await readFile(path.join(projectRoot, 'src/lib/applicationStatus.ts'), 'utf8');
const compiled = ts.transpileModule(statusSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const statusModule = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('candidate application tracker labels every recruiter-controlled status', () => {
  assert.equal(statusModule.getApplicationStatusLabel('new'), 'Applied');
  assert.equal(statusModule.getApplicationStatusLabel('under_review'), 'Reviewed');
  assert.equal(statusModule.getApplicationStatusLabel('shortlisted'), 'Shortlisted');
  assert.equal(statusModule.getApplicationStatusLabel('interviewing'), 'Interviewing');
  assert.equal(statusModule.getApplicationStatusLabel('offered'), 'Offered');
  assert.equal(statusModule.getApplicationStatusLabel('hired'), 'Hired');
  assert.equal(statusModule.getApplicationStatusLabel('rejected'), 'Rejected');
  assert.equal(statusModule.getApplicationStatusLabel('screened'), 'Reviewed');
  assert.equal(statusModule.getApplicationStatusLabel('unknown'), 'Status unavailable');
});

test('recruiter pipeline exposes only the next sequential stage', () => {
  assert.deepEqual(statusModule.NEXT_APPLICATION_STATUS, {
    new: 'under_review',
    under_review: 'shortlisted',
    shortlisted: 'interviewing',
    interviewing: 'offered',
    offered: 'hired',
  });
  assert.equal(statusModule.NEXT_APPLICATION_STATUS.hired, undefined);
  assert.equal(statusModule.NEXT_APPLICATION_STATUS.rejected, undefined);
  assert.equal(statusModule.normalizeApplicationStatus('screened'), 'under_review');
  assert.equal(statusModule.NEXT_APPLICATION_STATUS[statusModule.normalizeApplicationStatus('screened')], 'shortlisted');
});
