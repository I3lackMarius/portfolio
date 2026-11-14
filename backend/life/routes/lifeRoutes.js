import express from 'express';
import { createLifeController } from '../controllers/lifeController.js';
import { protect } from '../../middleware/auth.js';
import { requireTenantMembership } from '../middleware/tenantAuthorization.js';

const router = express.Router();
const lifeController = createLifeController();

router.get('/workspaces', protect, lifeController.workspaces);
router.get(
  '/context',
  protect,
  requireTenantMembership,
  lifeController.context,
);

export default router;
