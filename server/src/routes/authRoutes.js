import { Router } from 'express';
import { createAuthController } from '../controllers/authController.js';
import { createAuthMiddleware } from '../middleware/authMiddleware.js';
import { validateLogin, validateRegistration } from '../middleware/validateAuthRequest.js';
import { createAuthService } from '../services/authService.js';
import rateLimit from 'express-rate-limit';

const AUTH_RATE_LIMIT_DEFAULTS = {
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler(_request, _response, next) {
    const error = new Error('Too many authentication attempts. Please try again later.');
    error.status = 429;
    next(error);
  },
};

export function createAuthRoutes(dependencies = {}) {
  const router = Router();
  const authService = dependencies.authService ?? createAuthService(dependencies);
  const authController = createAuthController({ authService });
  const requireAuthentication = createAuthMiddleware(dependencies);
  const rateLimitOptions = dependencies.rateLimitOptions ?? {};
  const registrationLimiter = rateLimit({ ...AUTH_RATE_LIMIT_DEFAULTS, ...rateLimitOptions });
  const loginLimiter = rateLimit({ ...AUTH_RATE_LIMIT_DEFAULTS, ...rateLimitOptions });

  router.post('/register', registrationLimiter, validateRegistration, authController.register);
  router.post('/login', loginLimiter, validateLogin, authController.login);
  router.get('/me', requireAuthentication, authController.currentUser);

  return router;
}