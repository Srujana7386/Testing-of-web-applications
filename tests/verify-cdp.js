import { chromium } from 'playwright';
import assert from 'assert';

async function runCDPVerification() {
  console.log('====================================================');
  console.log(' Browser & CDP Connection Verification');
  console.log('====================================================');

  console.log('[1/5] Launching Chromium instance via Playwright...');
  const browser = await chromium.launch({
    headless: true
  });

  const browserVersion = browser.version();
  console.log(`      Chromium launched successfully. Version: ${browserVersion}`);

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 2. Load test accessibility fixture
    console.log('[2/5] Loading controlled accessibility test fixture...');
    const testHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>CDP Verification Fixture</title>
      </head>
      <body>
        <main>
          <h1>Accessible Test Heading</h1>
          <img src="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>" alt="Decorative icon" id="test-img">
          <button id="test-btn" aria-label="Explore Menu" aria-expanded="false">Menu</button>
          <div role="status" aria-live="polite" id="test-status">System Initialized</div>
          <div>
            <label for="username">Username</label>
            <input type="text" id="username" name="username" value="researcher">
          </div>
        </main>
      </body>
      </html>
    `;

    await page.setContent(testHtml, { waitUntil: 'load' });
    console.log('      Fixture content loaded into page.');

    // 3. Establish Chrome DevTools Protocol (CDP) session
    console.log('[3/5] Establishing Chrome DevTools Protocol (CDP) session...');
    const cdpSession = await page.context().newCDPSession(page);
    assert(cdpSession, 'CDP session must be successfully created');
    console.log('      CDP session established.');

    // 4. Test CDP Accessibility domain
    console.log('[4/5] Querying CDP Accessibility.getFullAXTree...');
    const axResult = await cdpSession.send('Accessibility.getFullAXTree');
    assert(axResult && Array.isArray(axResult.nodes), 'CDP must return an array of accessibility nodes');
    console.log(`      CDP returned ${axResult.nodes.length} Accessibility Tree nodes.`);

    // Inspect specific computed accessibility nodes
    const buttonNode = axResult.nodes.find(n => n.role && n.role.value === 'button');
    assert(buttonNode, 'Accessibility Tree must contain button node');
    assert(buttonNode.name && buttonNode.name.value === 'Explore Menu', 'Computed accessible name must match aria-label');
    console.log(`      Button AX Node: role="${buttonNode.role.value}", computedName="${buttonNode.name.value}"`);

    const expandedProp = buttonNode.properties?.find(p => p.name === 'expanded');
    assert(expandedProp && expandedProp.value.value === false, 'Expanded property must be false');
    console.log(`      Button AX Property: expanded=${expandedProp.value.value}`);

    const statusNode = axResult.nodes.find(n => n.role && n.role.value === 'status');
    assert(statusNode, 'Accessibility Tree must contain status node');
    const liveProp = statusNode.properties?.find(p => p.name === 'live');
    assert(liveProp && liveProp.value.value === 'polite', 'Live region property must be polite');
    console.log(`      Status AX Node: role="${statusNode.role.value}", live="${liveProp.value.value}"`);

    // 5. Verification complete
    console.log('[5/5] Browser & CDP Verification complete: ALL CHECKS PASSED.');
    console.log('====================================================\n');
  } finally {
    await browser.close();
    console.log('[CDP Teardown] Browser instance closed cleanly.');
  }
}

runCDPVerification().catch(err => {
  console.error('[CDP Verification Failed]:', err);
  process.exit(1);
});
