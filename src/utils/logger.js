// "src/utils/logger.js"

cat > src/utils/logger.js <<'EOF'
import { createLogger, format, transports } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";
import fs from "fs";

const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

const jsonFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.errors({ stack: true }),
  format.splat(),
  format.printf(info => {
    // keep compact text for console and JSON for files as needed
    if (info instanceof Error) {
      return `${info.timestamp} ${info.level}: ${info.message} ${info.stack || ""}`;
    }
    const base = {
      timestamp: info.timestamp,
      level: info.level,
      message: info.message,
      ...("meta" in info ? info.meta : {})
    };
    return JSON.stringify(base);
  })
);

const consoleTransport = new transports.Console({
  format: format.combine(format.colorize(), format.simple())
});

const rotateTransport = new DailyRotateFile({
  filename: path.join(logsDir, "uniguys-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: process.env.LOG_RETENTION_DAYS || "${LOG_RETENTION_DAYS}d",
  level: process.env.LOG_LEVEL || "info"
});

const logger = createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: format.combine(format.timestamp(), format.json()),
  defaultMeta: { service: "uniguys-backend" },
  transports: [rotateTransport, consoleTransport],
  exitOnError: false
});

// morgan stream compatibility
logger.stream = {
  write: (message) => {
    // morgan appends newline
    logger.info(message.trim());
  }
};

export default logger;
EOF