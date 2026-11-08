import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './routes/auth.routes';
import propertyRoutes from './routes/property.routes';
import favouriteRoutes from './routes/Favourites.routes';
import paymentroutes from './routes/payment.routes';
import inquiryRoutes from './routes/inquiry.routes';
import visitRoutes from './routes/visit.routes';
import savedSearchRoutes from './routes/savedSearch.routes';
import adminRoutes from './routes/admin.routes';
import communicationRoutes from './routes/communication.routes';
import advancedRoutes from './routes/advanced.routes';
import heroRoutes from './routes/hero.routes';
import notificationRoutes from './routes/notification.routes';
import agentRoutes from './routes/agent.routes';
import { errorHandler } from './middlewares/errorHandler.middleware';
import { NODE_ENV, FRONTEND_URL } from './config';
import logger from './utils/logger';
import path from 'path';

const app = express();

/**
 * MIDDLEWARES
 */
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const morganFormat = NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat, { 
  stream: { write: (message) => logger.info(message.trim()) } 
}));

// We must skip JSON parsing for the webhook route so the raw stream 
// is available for signature verification later in the router.
app.use((req, res, next) => {
  if (req.originalUrl === '/api/payment/webhook') {
    next(); // Skip JSON parsing for this specific route
  } else {
    express.json({ limit: '10kb' })(req, res, next); // Parse JSON for everything else
  }
});

app.use(express.urlencoded({ extended: true, limit: '10kb' }));


/**
 * API ROUTES
 */
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'success', message: 'Server is healthy' });
});

app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/users', favouriteRoutes);
app.use('/api/payment', paymentroutes);// The router file itself handles the /webhook and /create-checkout-session sub-paths.
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/saved-searches', savedSearchRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/communications', communicationRoutes);
app.use('/api/advanced', advancedRoutes);
app.use('/api', heroRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/agents', agentRoutes);

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 404 Handler
app.all(/(.*)/, (req: Request, res: Response) => {
  res.status(404).json({ success: false, message: `Can't find ${req.originalUrl} on this server!` });
});

// Global Error Handler
app.use(errorHandler);

export default app;