export const sendResponse = (res, status, data = {}, message = "OK") =>
  res.status(status).json({ success: true, message, ...data });
