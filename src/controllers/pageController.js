import config from '../configuration/config.js';
import { testRegister } from '../../research/test-register/register-data.js';

export const pageController = {
  renderHome(req, res) {
    const isFetch = req.xhr || req.headers.accept?.includes('application/json') || req.query.format === 'fragment';
    const data = {
      title: 'WCAG 2.2 Level AA Conformance Testing Test Bed',
      pageId: 'home',
      currentYear: new Date().getFullYear(),
      stats: {
        totalCriteria: 9,
        targetDefects: testRegister.filter(c => c.classification === 'defect').length || 30,
        targetControls: testRegister.filter(c => c.classification === 'compliant').length || 15,
        staticCases: testRegister.filter(c => c.nature === 'static').length
      }
    };

    if (isFetch) {
      return res.render('pages/home', { layout: false, ...data });
    }
    return res.render('pages/home', data);
  },

  renderRegister(req, res) {
    const isFetch = req.xhr || req.headers.accept?.includes('application/json') || req.query.format === 'fragment';
    const data = {
      title: 'Test-Case Register | WCAG 2.2 AA',
      pageId: 'register',
      currentYear: new Date().getFullYear(),
      testCases: testRegister,
      stats: {
        total: testRegister.length,
        defects: testRegister.filter(c => c.classification === 'defect').length,
        controls: testRegister.filter(c => c.classification === 'compliant').length,
        dynamic: testRegister.filter(c => c.nature === 'dynamic').length,
        static: testRegister.filter(c => c.nature === 'static').length
      }
    };

    if (isFetch) {
      return res.render('pages/register', { layout: false, ...data });
    }
    return res.render('pages/register', data);
  },

  renderScenarios(req, res) {
    const isFetch = req.xhr || req.headers.accept?.includes('application/json') || req.query.format === 'fragment';
    const data = {
      title: 'Dynamic Testing Scenarios (S1-S4) | WCAG 2.2 AA',
      pageId: 'scenarios',
      currentYear: new Date().getFullYear()
    };

    if (isFetch) {
      return res.render('pages/scenarios', { layout: false, ...data });
    }
    return res.render('pages/scenarios', data);
  },

  renderComponents(req, res) {
    const isFetch = req.xhr || req.headers.accept?.includes('application/json') || req.query.format === 'fragment';
    const data = {
      title: 'Component Catalogue | Defective & Compliant Controls',
      pageId: 'components',
      currentYear: new Date().getFullYear()
    };

    if (isFetch) {
      return res.render('pages/components', { layout: false, ...data });
    }
    return res.render('pages/components', data);
  },

  renderTestCase(req, res) {
    const { caseId } = req.params;
    const testCase = testRegister.find(c => c.id === caseId);

    if (!testCase) {
      return res.status(404).render('pages/404', {
        title: 'Test Case Not Found',
        pageId: '404',
        caseId,
        currentYear: new Date().getFullYear()
      });
    }

    const isFetch = req.xhr || req.headers.accept?.includes('application/json') || req.query.format === 'fragment';
    const data = {
      title: `Test Case ${testCase.id}: ${testCase.name}`,
      pageId: `test-${testCase.id}`,
      testCase,
      currentYear: new Date().getFullYear()
    };

    if (isFetch) {
      return res.render('pages/test-bed', { layout: false, ...data });
    }
    return res.render('pages/test-bed', data);
  }
};

export default pageController;
