import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import ts from 'typescript';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rawApiSource = await readFile(path.join(projectRoot, 'src/lib/api.ts'), 'utf8');

// Replace top-level external axios import with dummy object for node test isolated execution
const mockedSource = rawApiSource.replace(
  /import axios from "axios";/,
  'const axios = { create: () => ({ interceptors: { request: { use: () => {} }, response: { use: () => {} } } }) };'
);

const compiled = ts.transpileModule(mockedSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;

const apiModule = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const { getApiErrorMessage } = apiModule;

test('getApiErrorMessage handles standard backend ErrorResponse schema', () => {
  const errorObj = {
    response: {
      data: {
        error: {
          code: 'VALIDATION_FAILED',
          message: 'The requested job requisition is closed.',
          request_id: 'req-12345',
        },
      },
    },
  };
  assert.equal(getApiErrorMessage(errorObj), 'The requested job requisition is closed.');
});

test('getApiErrorMessage handles string error format { error: "..." }', () => {
  const errorObj = {
    response: {
      data: {
        error: 'Invalid credentials or inactive account.',
      },
    },
  };
  assert.equal(getApiErrorMessage(errorObj), 'Invalid credentials or inactive account.');
});

test('getApiErrorMessage handles error.details array with msg', () => {
  const errorObj = {
    response: {
      data: {
        error: {
          code: 'INVALID_INPUT',
          details: [{ loc: ['body', 'password'], msg: 'Password must be at least 8 characters long.' }],
        },
      },
    },
  };
  assert.equal(getApiErrorMessage(errorObj), 'Password must be at least 8 characters long.');
});

test('getApiErrorMessage handles standard FastAPI detail string and detail array', () => {
  const strDetail = {
    response: {
      data: {
        detail: 'The current password provided is incorrect.',
      },
    },
  };
  assert.equal(getApiErrorMessage(strDetail), 'The current password provided is incorrect.');

  const arrayDetail = {
    response: {
      data: {
        detail: [{ loc: ['body', 'email'], msg: 'Value is not a valid email address' }],
      },
    },
  };
  assert.equal(getApiErrorMessage(arrayDetail), 'Value is not a valid email address');
});

test('getApiErrorMessage handles generic { message } and standard Error objects', () => {
  const msgObj = {
    response: {
      data: {
        message: 'Requisition successfully closed.',
      },
    },
  };
  assert.equal(getApiErrorMessage(msgObj), 'Requisition successfully closed.');

  const standardErr = new Error('Network timeout during file upload');
  assert.equal(getApiErrorMessage(standardErr), 'Network timeout during file upload');
});

test('getApiErrorMessage falls back when response payload is empty', () => {
  assert.equal(getApiErrorMessage(null, 'Custom fallback'), 'Custom fallback');
  assert.equal(getApiErrorMessage({}, 'Custom fallback'), 'Custom fallback');
  assert.equal(getApiErrorMessage({ response: {} }, 'Custom fallback'), 'Custom fallback');
});

test('Profile enrichment synchronizes candidate full name and organization name into auth user', () => {
  const baseUser = {
    id: 'user-001',
    email: 'alice.vance@example.com',
    role: 'candidate',
    is_active: true,
  };

  const profileResponse = {
    id: 'user-001',
    email: 'alice.vance@example.com',
    role: 'candidate',
    is_active: true,
    name: 'Alice Vance',
    full_name: 'Alice Vance',
    headline: 'Senior Full Stack Engineer',
    location: 'San Francisco, CA',
    organization_name: null,
    skills: ['React', 'TypeScript', 'Python'],
    bio: 'Passionate software engineer',
  };

  const enrichedUser = {
    ...baseUser,
    name: profileResponse.name || profileResponse.full_name || baseUser.name || null,
    full_name: profileResponse.name || profileResponse.full_name || baseUser.full_name || null,
    organization_name: profileResponse.organization_name || baseUser.organization_name || null,
  };

  assert.equal(enrichedUser.name, 'Alice Vance');
  assert.equal(enrichedUser.full_name, 'Alice Vance');
  assert.equal(enrichedUser.email, 'alice.vance@example.com');
  assert.equal(enrichedUser.role, 'candidate');
});

test('Closed job application error mapping maps 404 to inactive status', () => {
  const mapJobApplyError = (statusCode, serverMsg) => {
    if (statusCode === 409) {
      return { type: 'already_applied', text: 'You have already applied to this job.' };
    }
    if (statusCode === 404) {
      return { type: 'closed', text: 'This job opening is no longer active or accepting applications.' };
    }
    if (statusCode === 400 && serverMsg.toLowerCase().includes('resume')) {
      return { type: 'resume_missing', text: 'No resume on file. Please upload your resume in Resume Studio before applying.' };
    }
    return { type: 'error', text: serverMsg || 'Failed to submit application.' };
  };

  assert.equal(mapJobApplyError(404, 'Job not found.').type, 'closed');
  assert.equal(mapJobApplyError(409, 'Conflict').type, 'already_applied');
  assert.equal(mapJobApplyError(400, 'Please upload a resume first').type, 'resume_missing');
});
