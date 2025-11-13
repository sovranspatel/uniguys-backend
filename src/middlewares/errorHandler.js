// "src/middlewares/errorHandler.js"
cat > src/middlewares/errorHandler.js <<'EOF'
import logger from "../utils/logger.js";

export function notFoundHandler(req, res, next) {
  res.status(404).json({ error: "Not Found", path: req.originalUrl });
}

export function errorHandler(err, req, res, next) {
  // log full error with stack
  logger.error("Unhandled error: %o", {
    message: err && err.message,
    stack: err && err.stack,
    path: req && req.originalUrl,
    method: req && req.method
  });

  const status = (err && err.status) || 500;
  const payload = {
    success: false,
    message: err && err.message ? err.message : "Internal Server Error"
  };
  if ((process.env.NODE_ENV || "development") !== "production" && err && err.stack) {
    payload.stack = err.stack;
  }
  res.status(status).json(payload);
}
EOF