import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { testRegister } from './register-data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../../');

function escapeCsv(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export function exportRegisterAndGroundTruth() {
  const registerJsonPath = path.join(ROOT, 'research/test-register/test-register.json');
  const registerCsvPath = path.join(ROOT, 'research/test-register/test-register.csv');
  const groundTruthJsonPath = path.join(ROOT, 'research/ground-truth/ground-truth.json');
  const groundTruthCsvPath = path.join(ROOT, 'research/ground-truth/ground-truth.csv');

  // 1. Write test-register.json
  fs.writeFileSync(registerJsonPath, JSON.stringify(testRegister, null, 2), 'utf-8');
  console.log(`[Export] Wrote ${testRegister.length} cases to ${registerJsonPath}`);

  // 2. Write test-register.csv
  const regHeaders = [
    'id', 'name', 'wcagCriterion', 'wcagLevel', 'component', 'nature',
    'classification', 'route', 'expectedOutcome', 'detectionCategory',
    'machineTestable', 'humanJudgementRequired'
  ];
  const regRows = [regHeaders.join(',')];
  for (const c of testRegister) {
    regRows.push(regHeaders.map(h => escapeCsv(c[h])).join(','));
  }
  fs.writeFileSync(registerCsvPath, regRows.join('\n'), 'utf-8');
  console.log(`[Export] Wrote CSV to ${registerCsvPath}`);

  // 3. Write ground-truth.json & CSV
  const groundTruthList = testRegister.map(c => ({
    caseId: c.id,
    wcagCriterion: c.wcagCriterion,
    name: c.name,
    nature: c.nature,
    classification: c.classification,
    groundTruthStatus: c.groundTruthStatus,
    expectedCondition: c.expectedCondition,
    failureCondition: c.failureCondition,
    verificationEvidence: c.verificationEvidence,
    verificationMethod: 'Manual inspection (Keyboard walkthrough, NVDA screen reader, DevTools accessibility inspector)'
  }));

  fs.writeFileSync(groundTruthJsonPath, JSON.stringify(groundTruthList, null, 2), 'utf-8');
  console.log(`[Export] Wrote ground truth to ${groundTruthJsonPath}`);

  const gtHeaders = [
    'caseId', 'wcagCriterion', 'name', 'nature', 'classification',
    'groundTruthStatus', 'expectedCondition', 'failureCondition',
    'verificationEvidence', 'verificationMethod'
  ];
  const gtRows = [gtHeaders.join(',')];
  for (const g of groundTruthList) {
    gtRows.push(gtHeaders.map(h => escapeCsv(g[h])).join(','));
  }
  fs.writeFileSync(groundTruthCsvPath, gtRows.join('\n'), 'utf-8');
  console.log(`[Export] Wrote ground truth CSV to ${groundTruthCsvPath}`);
}

exportRegisterAndGroundTruth();
