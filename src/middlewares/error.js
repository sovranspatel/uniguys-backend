// src/middlewares/error.js
import logger from "../utils/simpleLogger.js";

export function errorHandler(err, req, res, next) {
  logger.error("Unhandled error:", err && err.stack ? err.stack : err);
  const status = err && err.status ? err.status : 500;
  const body = { success: false, message: err && err.message ? err.message : "Internal Server Error" };
  if ((process.env.NODE_ENV || "development") !== "production") {
    body.stack = err && err.stack ? err.stack : undefined;
  }
  res.status(status).json(body);
}
