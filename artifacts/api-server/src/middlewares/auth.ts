import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserModel, type UserDoc } from "@workspace/db";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      appUser?: UserDoc;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const JWT_EXPIRES_IN = "7d";

export interface JwtPayload {
  sub: number; // user.id
  email: string;
  role: "admin" | "staff";
}

export function signToken(user: Pick<UserDoc, "id" | "email" | "role">): string {
  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header && header.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim();
  }
  const cookieToken = (req as { cookies?: Record<string, string> }).cookies?.[
    "auth_token"
  ];
  return cookieToken || null;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    const user = await UserModel.findOne({ id: decoded.sub }).lean<UserDoc>();
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    req.appUser = user;
    next();
  } catch (err) {
    req.log.warn({ err }, "JWT verification failed");
    res.status(401).json({ error: "Unauthorized" });
  }
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.appUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (req.appUser.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}
