import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { createCorsOptions } from './config/cors.js';
import { getTrustProxy } from './config/proxy.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { createRequestContext } from './middleware/requestContext.js';
import { createAuthRoutes } from './routes/authRoutes.js';
import { createDashboardRoutes } from './routes/dashboardRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import { createProfileRoutes } from './routes/profileRoutes.js';
import { createResumeRoutes } from './routes/resumeRoutes.js';
import { createJobIntelligenceRoutes } from './routes/jobIntelligenceRoutes.js';
import { createCareerAssistantRoutes } from './routes/careerAssistantRoutes.js';
import { createCareerPlanRoutes } from './routes/careerPlanRoutes.js';
import { createJobRoutes } from './routes/jobRoutes.js';
import { createApplicationRoutes } from './routes/applicationRoutes.js';

export function createApp({
	authDependencies,
	resumeDependencies = authDependencies,
	jobDependencies = authDependencies,
	jobRecommendationDependencies = authDependencies,
	careerDependencies = authDependencies,
	applicationDependencies = authDependencies,
	dashboardDependencies = authDependencies,
	logger = console,
	authRateLimitOptions = {},
	trustProxy = getTrustProxy(),
} = {}) {
	const app = express();

	app.disable('x-powered-by');
	app.set('trust proxy', trustProxy);
	app.use(helmet({
	  frameguard: { action: 'deny' },
	  contentSecurityPolicy: {
	    directives: {
	      defaultSrc: ["'none'"],
	      baseUri: ["'none'"],
	      connectSrc: ["'none'"],
	      formAction: ["'none'"],
	      frameAncestors: ["'none'"],
	      imgSrc: ["'none'"],
	      objectSrc: ["'none'"],
	      scriptSrc: ["'none'"],
	      styleSrc: ["'none'"],
	      upgradeInsecureRequests: null,
	    },
	  },
	}));
	app.use(createRequestContext(logger));
	app.use(cors(createCorsOptions()));
	app.use(express.json({ limit: '1mb' }));
	app.use('/api', healthRoutes);
	app.use('/api/auth', createAuthRoutes({
	  ...authDependencies,
	  rateLimitOptions: authRateLimitOptions,
	}));
	app.use('/api/profile', createProfileRoutes(authDependencies));
	app.use('/api/dashboard', createDashboardRoutes(dashboardDependencies));
	app.use('/api/resume', createResumeRoutes(resumeDependencies));
	app.use('/api/job-intelligence', createJobIntelligenceRoutes(jobDependencies));
	app.use('/api/jobs', createJobRoutes(jobRecommendationDependencies));
	app.use('/api/career-assistant', createCareerAssistantRoutes(careerDependencies));
	app.use('/api/career-plans', createCareerPlanRoutes(careerDependencies));
	app.use('/api/applications', createApplicationRoutes(applicationDependencies));
	app.use(notFoundHandler);
	app.use((error, request, response, next) => errorHandler(error, request, response, next, logger));

	return app;
}
