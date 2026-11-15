# Accessibility Conformance Testing SPA

A Node.js single page application for a prototype comparison of DOM based and Accessibility Tree based checks against selected WCAG 2.2 scenarios.

## Current implementation

- Express application with SPA routes, dashboard, fixture pages, and sandbox.
- Test register containing 45 cases (30 defects and 15 controls).
- Rule catalogue covering nine WCAG criteria.
- Initial DOM and Accessibility Tree evaluators.
- Playwright browser automation and a static pilot runner that evaluates each static case once.
- Application integration tests covering routes, register rendering, fixtures, and API behavior.

The current prototype includes interactive dynamic scenario fixtures. Automated interaction scenarios and their evaluation are future work. axe-core is not installed or executed by the active pilot runner.

## Experiment evidence

The active `experiments/raw/` directory contains a verified static pilot run: 27 static cases, one run each, with 27 DOM records and 27 Accessibility Tree records. Metadata records the run's Node.js, Playwright, Chromium, and operating system versions. Earlier multi-run experiment outputs are not included and were not used for this pilot.

The prototype also has known limitations: evaluator checks are case specific, ground truth remains provisional, sandbox scope is limited, and a known false PASS remains unresolved. These limitations are retained as findings. Their correction and validation are future work.

## Future work

- Reconcile the reported 27-case static pilot against verifiable source records and Appendix C before presenting raw pilot results.
- Integrate and compare the axe-core reference evaluator.
- Implement independent automation drivers for dynamic scenarios and controlled repeated runs.
- Generate case level comparative results, precision, recall, F1, agreement statistics, and disagreement analysis from verified data.
- Complete root cause analysis and final comparative reporting.
- Generalize evaluator checks, address sandbox scope, and investigate the known false PASS.

## Project structure

```text
accessibility/       DOM and Accessibility Tree evaluators and rule catalogue
automation/          Static pilot orchestration
research/            Test register, ground truth, and rule specifications
experiments/raw/     Reserved for verified static pilot records
src/                 Express application and routes
public/, views/      Frontend assets and pages
tests/               Application integration tests
```

## Requirements and commands

- Node.js and npm
- Chromium available through Playwright

```powershell
npm install
npx playwright install chromium
npm start
```

Open `http://localhost:3000` after starting the app.

```powershell
node tests/verify-environment.js
node tests/verify-cdp.js
npm test
npm run experiment
```

The experiment command runs one static evaluation per static test case using the DOM and Accessibility Tree evaluators. It does not execute dynamic interactions, axe-core, or comparative statistical analysis.

## License

This project is currently unlicensed.
