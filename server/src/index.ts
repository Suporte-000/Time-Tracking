// TimeTrack Server - Main Entry Point

import express from 'express';
import cors from 'cors';
import config from './config/env.js';
import authRoutes from './routes/auth.routes.js';

const app = express();

// Middleware
app.use(cors({
  origin: config.cors.origins,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'TimeTrack Server is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: config.env === 'development' ? err.message : 'Internal server error',
  });
});

// Start server
const PORT = config.port;

app.listen(PORT, () => {
  console.log(`
┌─────────────────────────────────────────────────────────────┐
│  TimeTrack Server                                           │
│  Environment: ${config.env.padEnd(47)}│
│  Port: ${PORT.toString().padEnd(52)}│
│  API: http://localhost:${PORT}/api                         │
│  Health: http://localhost:${PORT}/health                   │
└─────────────────────────────────────────────────────────────┘
  `);
});

export default app;
