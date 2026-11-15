import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import { createApp } from '../../src/server/app.js';

describe('SPA Navigation and Express Routes Integration Tests', () => {
  let server;
  const testPort = 3105;

  before(async () => {
    const app = createApp();
    server = await new Promise(resolve => {
      const s = app.listen(testPort, '127.0.0.1', () => resolve(s));
    });
  });

  after(async () => {
    await new Promise(resolve => server.close(resolve));
  });

  function request(path, options = {}) {
    return new Promise((resolve, reject) => {
      const req = http.request(`http://127.0.0.1:${testPort}${path}`, options, res => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body }));
      });
      req.on('error', reject);
      if (options.body) {
        req.write(options.body);
      }
      req.end();
    });
  }

  it('GET / should render the research dashboard', async () => {
    const res = await request('/');
    assert.strictEqual(res.statusCode, 200);
    assert(res.body.includes('WCAG 2.2 Level AA Conformance Testing Test Bed'));
    assert(res.body.includes('data-app-state="ready"'));
  });

  it('GET /register should render the full 45-case register view', async () => {
    const res = await request('/register');
    assert.strictEqual(res.statusCode, 200);
    assert(res.body.includes('TC-1.1.1-01'));
    assert(res.body.includes('TC-4.1.3-05'));
    assert(res.body.includes('Defects (30)'));
    assert(res.body.includes('Compliant (15)'));
  });

  it('GET /scenarios should render the 4 dynamic testing scenarios', async () => {
    const res = await request('/scenarios');
    assert.strictEqual(res.statusCode, 200);
    assert(res.body.includes('Scenario S1: SPA Route Change'));
    assert(res.body.includes('Scenario S2: Modal Dialog'));
    assert(res.body.includes('Scenario S3: Dynamic Status Message'));
    assert(res.body.includes('Scenario S4: Interactive Widget State'));
  });

  it('GET /components should render defective and compliant variants', async () => {
    const res = await request('/components');
    assert.strictEqual(res.statusCode, 200);
    assert(res.body.includes('Defective Variant'));
    assert(res.body.includes('Compliant Variant'));
  });

  it('GET /test/:caseId should render isolated test fixture sandbox', async () => {
    const res = await request('/test/TC-1.1.1-01');
    assert.strictEqual(res.statusCode, 200);
    assert(res.body.includes('id="test-bed-sandbox"'));
    assert(res.body.includes('data-case-id="TC-1.1.1-01"'));
    assert(res.body.includes('data-fixture-ready="true"'));
  });

  it('GET /test/INVALID-ID should return 404', async () => {
    const res = await request('/test/INVALID-ID');
    assert.strictEqual(res.statusCode, 404);
    assert(res.body.includes('Test Case Not Found'));
  });

  it('GET /register?format=fragment should return partial view without layout', async () => {
    const res = await request('/register?format=fragment');
    assert.strictEqual(res.statusCode, 200);
    assert(!res.body.includes('<!DOCTYPE html>'));
    assert(res.body.includes('WCAG 2.2 Level AA Test-Case Register'));
  });

  it('GET /api/register should return JSON test register', async () => {
    const res = await request('/api/register');
    assert.strictEqual(res.statusCode, 200);
    const json = JSON.parse(res.body);
    assert.strictEqual(json.total, 45);
    assert.strictEqual(json.cases.length, 45);
  });

  it('POST /api/submit-status should simulate live region feedback', async () => {
    const postData = JSON.stringify({ type: 'success', name: 'Tester' });
    const res = await request('/api/submit-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      body: postData
    });
    assert.strictEqual(res.statusCode, 200);
    const json = JSON.parse(res.body);
    assert.strictEqual(json.success, true);
    assert(json.message.includes('Changes saved.'));
  });
});
