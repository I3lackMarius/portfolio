import express from 'express';
import { createAuthController } from '../controllers/authController.js';
import { adminOnly, protect } from '../middleware/auth.js';
import { loginRateLimit } from '../middleware/loginRateLimit.js';

const router = express.Router();
const authController = createAuthController();

router.get('/csrf', authController.csrfToken);
router.post('/register', authController.register);
router.post('/login', loginRateLimit, authController.login);
router.get('/me', protect, authController.currentUser);
router.get('/private', protect, adminOnly, authController.privateArea);
router.post('/logout', authController.logout);

export default router;
