import jwt from "jsonwebtoken";

export function authRequired(req, res, next) {
  try {
    const bearer = req.headers.authorization;
    const token = bearer?.startsWith("Bearer ") ? bearer.split(" ")[1] : req.cookies?.token;
    if (!token) return res.status(401).json({ success: false, message: "Unauthorized" });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, role, email }
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}
