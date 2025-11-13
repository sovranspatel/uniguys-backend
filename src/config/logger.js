// src/utils/logger.js

cat > src/utils/logger.js <<'EOF'
import { createLogger, format, transports } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';

const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

const logFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.splat(),
  format.json()
);

const transportConsole = new transports.Console({
  format: format.combine(format.colorize(), format.simple())
});

const transportFile = new DailyRotateFile({
  filename: path.join(logsDir, 'uniguys-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  zippedArchive: true,
  level: process.env.LOG_LEVEL || 'info'
});

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [transportFile, transportConsole],
  exitOnError: false
});

// stream for morgan
logger.stream = {
  write: (message) => {
    // morgan adds a newline at end; trim it
    logger.info(message.trim());
  }
};

export default logger;
EOF
