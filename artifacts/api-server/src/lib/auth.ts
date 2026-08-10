import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.SESSION_SECRET ?? "chase-bank-secret-2024";
const JWT_EXPIRES_IN = "7d";
const JWT_SHORT_EXPIRES_IN = "24h";

export function signUserToken(userId: number, rememberMe = false): string {
  return jwt.sign({ userId, type: "user" }, JWT_SECRET, {
    expiresIn: rememberMe ? JWT_EXPIRES_IN : JWT_SHORT_EXPIRES_IN,
  });
}

export function signAdminToken(adminId: number): string {
  return jwt.sign({ adminId, type: "admin" }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

export function verifyToken(token: string): jwt.JwtPayload {
  return jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
}

function extractToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) {
    return auth.slice(7);
  }
  return null;
}

export function requireUser(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const payload = verifyToken(token);
    if (payload.type !== "user") {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    (req as Request & { userId: number }).userId = payload.userId as number;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const payload = verifyToken(token);
    if (payload.type !== "admin") {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    (req as Request & { adminId: number }).adminId = payload.adminId as number;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
