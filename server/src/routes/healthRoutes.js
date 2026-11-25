import { Router } from 'express';
import { getHealth, getLiveness, getReadiness } from '../controllers/healthController.js';

const healthRoutes = Router();

healthRoutes.get('/health', getHealth);
healthRoutes.get('/health/live', getLiveness);
healthRoutes.get('/health/ready', getReadiness);

export default healthRoutes;