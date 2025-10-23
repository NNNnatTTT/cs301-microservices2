import jwt from "jsonwebtoken";

export function requireAuthREAL(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // e.g. payload = { id: "...", role: "admin" }
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

// (TEST ONLY)
export function requireAuth(req, _res, next) {
  req.user = { id: "11111111-1111-1111-1111-111111111111", role: "admin" };
  next();
}

