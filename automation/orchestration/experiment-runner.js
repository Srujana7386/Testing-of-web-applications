import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { createApp } from '../../src/server/app.js';
import { testRegister } from '../../research/test-register/register-data.js';
import { DomEvaluator } from '../../accessibility/dom-evaluator/dom-evaluator.js';
import { TreeEvaluator } from '../../accessibility/tree-evaluator/tree-evaluator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../../');
const require = createRequire(import.meta.url);
const playwrightVersion = require('playwright/package.json').version;

export class ExperimentRunner {
  constructor(options = {}) {
    this.port = options.port || 3200;
    this.domEvaluator = new DomEvaluator();
    this.treeEvaluator = new TreeEvaluator();
    this.server = null;
    this.browser = null;
  }

  async startServer() {
    const app = createApp();
    this.server = await new Promise(resolve => {
      const s = app.listen(this.port, '127.0.0.1', () => resolve(s));
    });
    console.log(`[ExperimentRunner] Local Express test server running on http://127.0.0.1:${this.port}`);
  }

  async stopServer() {
    if (this.server) {
      await new Promise(resolve => this.server.close(resolve));
      console.log('[ExperimentRunner] Local test server stopped.');
    }
  }

  async runAllExperiments() {
    const pilotCases = testRegister.filter(testCase => testCase.nature === 'static');
    console.log('=================================================================');
    console.log(' STARTING STATIC ACCESSIBILITY PILOT');
    console.log(' Comparing DOM and Accessibility Tree evaluators');
    console.log(` Static cases selected: ${pilotCases.length}`);
    console.log('=================================================================\n');

    await this.startServer();

    this.browser = await chromium.launch({ headless: true });
    const browserVersion = this.browser.version();

    const rawDomResults = [];
    const rawTreeResults = [];

    const experimentMetadata = {
      experimentId: `EXP-${Date.now()}`,
      startTime: new Date().toISOString(),
      nodeVersion: process.version,
      playwrightVersion,
      chromiumVersion: browserVersion,
      operatingSystem: `${os.type()} ${os.release()} (${os.arch()})`,
      totalCases: pilotCases.length,
      runsPerCase: 1,
      caseNature: 'static',
      evaluators: ['DOM', 'Accessibility Tree']
    };

    try {
      const context = await this.browser.newContext({
        viewport: { width: 1280, height: 800 },
        userAgent: 'A11yResearchAutomatedRunner/1.0 (Chromium)'
      });

      const page = await context.newPage();
      const cdpSession = await context.newCDPSession(page);

      let caseIndex = 1;
      for (const testCase of pilotCases) {
        const totalRuns = 1;

        console.log(`[${caseIndex}/${pilotCases.length}] Evaluating ${testCase.id} (${testCase.name}) [STATIC]...`);

        for (let runId = 1; runId <= totalRuns; runId++) {
          const testUrl = `http://127.0.0.1:${this.port}${testCase.route}`;

          // Navigate to test case fixture
          await page.goto(testUrl, { waitUntil: 'domcontentloaded' });

          // Deterministic wait for application ready state and fixture ready state
          await page.waitForSelector('body[data-app-state="ready"]', { timeout: 5000 });
          await page.waitForSelector('#test-bed-sandbox[data-fixture-ready="true"]', { timeout: 5000 });

          const contextMeta = {
            runId,
            browserVersion,
            state: 'static'
          };

          // 1. Run DOM Evaluator
          const domResult = await this.domEvaluator.evaluate(page, testCase, contextMeta);
          rawDomResults.push(domResult);

          // 2. Run Accessibility Tree Evaluator
          const treeResult = await this.treeEvaluator.evaluate(cdpSession, testCase, contextMeta);
          rawTreeResults.push(treeResult);

        }

        caseIndex++;
      }

      experimentMetadata.endTime = new Date().toISOString();
      console.log('\n[ExperimentRunner] All test executions completed successfully.');

      // Save raw experiment data
      this.saveExperimentResults(experimentMetadata, rawDomResults, rawTreeResults);

    } finally {
      if (this.browser) await this.browser.close();
      await this.stopServer();
    }
  }

  saveExperimentResults(metadata, domResults, treeResults) {
    const rawDir = path.join(ROOT, 'experiments/raw');

    if (!fs.existsSync(rawDir)) fs.mkdirSync(rawDir, { recursive: true });

    // 1. Save metadata manifest
    fs.writeFileSync(path.join(rawDir, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf-8');

    // 2. Save raw engine JSON files
    fs.writeFileSync(path.join(rawDir, 'dom-raw-results.json'), JSON.stringify(domResults, null, 2), 'utf-8');
    fs.writeFileSync(path.join(rawDir, 'tree-raw-results.json'), JSON.stringify(treeResults, null, 2), 'utf-8');
    // 3. Save combined raw CSV
    const csvHeaders = ['caseId', 'ruleId', 'engineName', 'verdict', 'runId', 'applicationState', 'explanation'];
    const csvRows = [csvHeaders.join(',')];

    const escapeCsv = (str) => `"${String(str || '').replace(/"/g, '""')}"`;

    for (const r of [...domResults, ...treeResults]) {
      csvRows.push([
        r.caseId,
        r.ruleId,
        r.engineName,
        r.verdict,
        r.runId,
        r.applicationState,
        escapeCsv(r.explanation)
      ].join(','));
    }

    fs.writeFileSync(path.join(rawDir, 'all-runs-raw.csv'), csvRows.join('\n'), 'utf-8');
    console.log(`[ExperimentRunner] Raw results saved to ${rawDir}`);
  }
}

// Execute runner if invoked directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const runner = new ExperimentRunner();
  runner.runAllExperiments().catch(err => {
    console.error('[Experiment Execution Error]:', err);
    process.exit(1);
  });
}

export default ExperimentRunner;
