import { Router } from 'express';
import { createApplicationController } from '../controllers/applicationController.js';
import { createAuthMiddleware } from '../middleware/authMiddleware.js';
import {
  validateApplicationId,
  validateApplicationList,
  validateCreateApplication,
  validateUpdateApplication,
} from '../middleware/validateApplicationRequest.js';
import { createApplicationService } from '../services/applicationService.js';

export function createApplicationRoutes(dependencies = {}) {
  const router = Router();
  const controller = createApplicationController({
    service: createApplicationService(dependencies),
  });

  router.use(createAuthMiddleware(dependencies));
  router.post('/', validateCreateApplication, controller.create);
  router.get('/', validateApplicationList, controller.list);
  router.get('/stats', controller.stats);
  router.get('/:id', validateApplicationId, controller.getById);
  router.patch('/:id', validateApplicationId, validateUpdateApplication, controller.update);
  router.delete('/:id', validateApplicationId, controller.remove);

  return router;
}
