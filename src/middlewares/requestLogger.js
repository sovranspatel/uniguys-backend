// src/middlewares/requestLogger.js
import morgan from "morgan";
import logger from "../utils/logger.js"; // we'll create logger.js below

const fmt = process.env.MORGAN_FORMAT || "combined"; // or "tiny"
const requestLogger = morgan(fmt, {
  stream: logger.stream,
  skip: (req, res) => process.env.NODE_ENV === "test"
});

export default requestLogger;
