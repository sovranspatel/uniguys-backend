cat > src/app.js <<'EOF'
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import bodyParser from 'body-parser';
import requestLogger from './middleware/requestLogger.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import logger from './utils/logger.js';

const app = express();

// security
app.use(helmet());

// body
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// cors - optional: you can read from CORS_ORIGINS env
const corsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
app.use(cors({
  origin: corsOrigins.length ? corsOrigins : true,
  credentials: true
}));

// request logging (morgan -> winston)
app.use(requestLogger);

// mount routes
app.use('/api/auth', authRoutes);

// 404 + error handler
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
EOF
