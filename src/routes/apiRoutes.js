import { Router } from 'express';
import apiController from '../controllers/apiController.js';

const router = Router();

router.get('/register', apiController.getRegister);
router.get('/test-case/:id', apiController.getTestCase);
router.post('/submit-status', apiController.submitStatusAction);

export default router;
