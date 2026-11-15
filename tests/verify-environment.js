import http from 'http';
import assert from 'assert';
import { createApp } from '../src/server/app.js';
import { chromium } from 'playwright';

async function runEnvironmentVerification() {
  console.log('====================================================');
  console.log(' Environment & Application Verification');
  console.log('====================================================');

  // 1. Verify Node.js version
  console.log(`[1/4] Checking Node.js version: ${process.version}...`);
  const majorVersion = parseInt(process.version.replace('v', '').split('.')[0], 10);
  assert(majorVersion >= 18, `Node.js version must be >= 18, found ${process.version}`);
  console.log('      Node.js version OK.');

  // 2. Verify Playwright dependency
  console.log('[2/4] Checking Playwright module availability...');
  assert(typeof chromium.launch === 'function', 'Playwright chromium.launch must be a function');
  console.log('      Playwright module OK.');

  // 3. Verify Express + Handlebars server startup & health check
  console.log('[3/4] Testing Express + Handlebars HTTP server...');
  const app = createApp();
  const testPort = 3099; // Use non-conflicting test port

  const server = await new Promise((resolve) => {
    const s = app.listen(testPort, '127.0.0.1', () => resolve(s));
  });

  try {
    // Health endpoint check
    const healthData = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${testPort}/api/health`, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          assert.strictEqual(res.statusCode, 200, 'Health check should return status 200');
          resolve(JSON.parse(body));
        });
      }).on('error', reject);
    });

    assert.strictEqual(healthData.status, 'ready', 'Health status should be ready');
    console.log(`      Health endpoint verified: ${healthData.status} (${healthData.framework})`);

    // Homepage render check
    const homeHtml = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${testPort}/`, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          assert.strictEqual(res.statusCode, 200, 'Homepage should return status 200');
          resolve(body);
        });
      }).on('error', reject);
    });

    assert(homeHtml.includes('WCAG 2.2 Conformance Test Bed'), 'Homepage title rendered correctly');
    assert(homeHtml.includes('Investigating Approaches to Automated Accessibility Conformance Testing'), 'Hero section rendered');
    assert(homeHtml.includes('data-app-state="ready"'), 'Deterministic automation state attribute found');
    console.log('      Handlebars view engine rendering verified.');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    console.log('      HTTP test server closed cleanly.');
  }

  // 4. Overall verdict
  console.log('[4/4] Environment verification complete: ALL CHECKS PASSED.');
  console.log('====================================================\n');
}

runEnvironmentVerification().catch(err => {
  console.error('[Verification Failed]:', err);
  process.exit(1);
});
