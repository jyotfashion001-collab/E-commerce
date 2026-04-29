import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { UserModel } from "@workspace/db";
import { signToken, requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

interface RegisterBody {
  email?: unknown;
  password?: unknown;
  fullName?: unknown;
}

interface LoginBody {
  email?: unknown;
  password?: unknown;
}

function isString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const body = (req.body ?? {}) as RegisterBody;
  if (!isString(body.email) || !isString(body.password)) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }
  const email = body.email.trim().toLowerCase();
  const password = body.password;

  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  const existing = await UserModel.findOne({ email }).lean();
  if (existing) {
    res.status(409).json({ error: "An account with that email already exists" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const fullName = isString(body.fullName) ? body.fullName.trim() : null;

  const userCount = await UserModel.estimatedDocumentCount();
  const role: "admin" | "staff" = userCount === 0 ? "admin" : "staff";

  const user = await UserModel.create({
    email,
    passwordHash,
    fullName,
    role,
    avatarUrl: null,
  });

  const token = signToken({ id: user.id, email: user.email, role: user.role });
  res.status(201).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      role: user.role,
    },
  });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const body = (req.body ?? {}) as LoginBody;
  if (!isString(body.email) || !isString(body.password)) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }
  const email = body.email.trim().toLowerCase();
  const user = await UserModel.findOne({ email });
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  const ok = await bcrypt.compare(body.password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  const token = signToken({ id: user.id, email: user.email, role: user.role });
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      role: user.role,
    },
  });
});

router.post("/auth/logout", (_req, res) => {
  res.json({ ok: true });
});

router.get("/auth/me", requireAuth, (req, res) => {
  const u = req.appUser!;
  res.json({
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    avatarUrl: u.avatarUrl,
    role: u.role,
  });
});

export default router;
