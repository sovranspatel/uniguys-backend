// src/utils/simpleLogger.js
const info = (...args) => console.log(new Date().toISOString(), "INFO", ...args);
const warn = (...args) => console.warn(new Date().toISOString(), "WARN", ...args);
const error = (...args) => console.error(new Date().toISOString(), "ERROR", ...args);
export default { info, warn, error };
