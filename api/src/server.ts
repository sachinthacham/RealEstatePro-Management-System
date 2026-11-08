import mongoose from 'mongoose';
import app from './app';
import { connectDB } from './config/db';
import { PORT, NODE_ENV } from './config';
import logger from './utils/logger';

const start = async () => {
  mongoose.set('strictQuery', true);
  await connectDB();
  logger.info('Successfully connected to MongoDB.');

  const server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} in ${NODE_ENV} mode`);
  });

  process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
      logger.info('Process terminated.');
      mongoose.connection.close(false);
    });
  });
};

start().catch((err) => {
  logger.error('Failed to start server', err);
  process.exit(1);
});
