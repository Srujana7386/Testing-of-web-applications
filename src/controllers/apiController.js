import { testRegister } from '../../research/test-register/register-data.js';

export const apiController = {
  getRegister(req, res) {
    const { criterion, classification, nature } = req.query;
    let filtered = [...testRegister];

    if (criterion) {
      filtered = filtered.filter(c => c.wcagCriterion === criterion);
    }
    if (classification) {
      filtered = filtered.filter(c => c.classification === classification);
    }
    if (nature) {
      filtered = filtered.filter(c => c.nature === nature);
    }

    res.json({
      total: filtered.length,
      cases: filtered
    });
  },

  getTestCase(req, res) {
    const { id } = req.params;
    const testCase = testRegister.find(c => c.id === id);
    if (!testCase) {
      return res.status(404).json({ error: `Test case ${id} not found.` });
    }
    res.json(testCase);
  },

  submitStatusAction(req, res) {
    const { type, name } = req.body;
    if (type === 'error') {
      return res.status(400).json({
        success: false,
        message: 'Submission failed: Required form field "Full Name" is invalid.',
        code: 'ERR_VALIDATION'
      });
    }

    return res.json({
      success: true,
      message: `Form submitted successfully for ${name || 'User'}. Changes saved.`,
      timestamp: new Date().toISOString()
    });
  }
};

export default apiController;
