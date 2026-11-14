import express from 'express';
import { createAuthController } from '../controllers/authController.js';
import { adminOnly, protect } from '../middleware/auth.js';

const router = express.Router();
const authController = createAuthController();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', protect, authController.currentUser);
router.get('/private', protect, adminOnly, authController.privateArea);

export default router;
