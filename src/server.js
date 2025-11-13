// src/server.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import bodyParser from "body-parser";
import { connectDB } from "./db.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import userActivityRoutes from "./routes/userActivity.routes.js";
import messageRequestRoutes from "./routes/messageRequest.routes.js";
import reportRoutes from "./routes/report.routes.js";
import { errorHandler } from "./middlewares/error.js";
import logger from "./utils/simpleLogger.js";

const app = express();

// Optional request logger (morgan) if you created it
let requestLogger;
try {
  // if you added requestLogger middleware earlier (morgan -> winston)
  // place it at src/middlewares/requestLogger.js and it will be used
  // otherwise this import will fail and we continue without it.
  // eslint-disable-next-line
  requestLogger = (await import("./middlewares/requestLogger.js")).default;
} catch (e) {
  requestLogger = null;
  logger.info("requestLogger middleware not found, continuing without morgan");
}

// If you're behind a reverse proxy (nginx / ELB) this helps cookie + ip logic
if ((process.env.TRUST_PROXY || "true").toLowerCase() === "true") {
  app.set("trust proxy", 1);
}

// ---- Security + parsers ----
app.use(helmet());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// ---- CORS ----
// keep your allowed list but fallback to permissive during development
const allowed = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // allow curl/postman (no origin)
      try {
        const hostname = new URL(origin).hostname;
        if (allowed.includes(origin) || hostname === "localhost" || hostname === "127.0.0.1") {
          return cb(null, true);
        }
      } catch (err) {
        return cb(new Error(`CORS blocked for origin: ${origin}`));
      }
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

// ---- Request logging (if available) ----
if (requestLogger) {
  app.use(requestLogger);
} else {
  // minimal logger for requests (fallback)
  app.use((req, res, next) => {
    logger.info(`[req] ${req.method} ${req.originalUrl} from ${req.ip}`);
    next();
  });
}

// ---- Health ----
app.get("/api/health", (_req, res) =>
  res.json({ ok: true, env: process.env.NODE_ENV || "development" })
);

// ---- Routes ----
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/useractivities", userActivityRoutes);
app.use("/api/messagerequests", messageRequestRoutes);
app.use("/api/reports", reportRoutes);

// ---- 404 (keep it JSON) ----
app.use((req, res) =>
  res.status(404).json({ error: "Not Found", path: req.originalUrl })
);

// ---- error handler (last) ----
app.use(errorHandler);

// ---- Start ----
const port = Number(process.env.PORT || 8000);

connectDB()
  .then(() => {
    const server = app.listen(port, "0.0.0.0", () => {
      logger.info(`Server running at http://localhost:${port} (env=${process.env.NODE_ENV || "development"})`);
    });

    // graceful shutdown helper
    const shutdown = (signal) => {
      logger.info(`${signal} received — closing server`);
      server.close(async () => {
        try {
          // wait for any async cleanup if needed
          await Promise.resolve();
        } catch (e) {
          logger.error("Error during shutdown cleanup: %o", e);
        }
        logger.info("Server stopped. Exiting process.");
        process.exit(0);
      });

      // if not closed in 10s, force exit
      setTimeout(() => {
        logger.warn("Forcing exit after 10s");
        process.exit(1);
      }, 10000).unref();
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));

    // global error handlers
    process.on("unhandledRejection", (reason) => {
      logger.error("Unhandled Rejection: %o", reason);
    });
    process.on("uncaughtException", (err) => {
      logger.error("Uncaught Exception: %o", err && err.stack ? err.stack : err);
      // give logger a moment then exit
      setTimeout(() => process.exit(1), 200);
    });
  })
  .catch((err) => {
    logger.error("Startup failed: %o", err && err.stack ? err.stack : err);
    process.exit(1);
  });
