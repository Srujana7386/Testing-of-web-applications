import { Router } from 'express';
import pageController from '../controllers/pageController.js';

const router = Router();

router.get('/', pageController.renderHome);
router.get('/register', pageController.renderRegister);
router.get('/scenarios', pageController.renderScenarios);
router.get('/components', pageController.renderComponents);
router.get('/test/:caseId', pageController.renderTestCase);

export default router;
