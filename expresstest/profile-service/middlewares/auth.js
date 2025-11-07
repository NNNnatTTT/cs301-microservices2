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
  // req.user.id = req.user.sub;
  // req.user = { id: "11111111-1111-1111-1111-111111111111", role: "agent" };
  req.user = {sub : "24988448-20a1-7025-59a4-e27cbfdd22ef", role: "agent"};
  next();
}

