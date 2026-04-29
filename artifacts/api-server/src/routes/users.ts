import { Router, type IRouter } from "express";
import { UserModel, type UserDoc } from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

function serializeUser(u: UserDoc) {
  return {
    id: u.id,
    clerkUserId: String(u.id),
    email: u.email,
    fullName: u.fullName,
    avatarUrl: u.avatarUrl,
    role: u.role,
    createdAt: new Date(u.createdAt).toISOString(),
  };
}

router.get(
  "/users",
  requireAuth,
  requireAdmin,
  async (_req, res): Promise<void> => {
    const users = await UserModel.find().sort({ id: 1 }).lean<UserDoc[]>();
    res.json(users.map(serializeUser));
  },
);

router.patch(
  "/users/:id",
  requireAuth,
  requireAdmin,
  async (req, res): Promise<void> => {
    const id = Number(req.params["id"]);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const role = (req.body ?? {})["role"];
    if (role !== "admin" && role !== "staff") {
      res.status(400).json({ error: "role must be 'admin' or 'staff'" });
      return;
    }
    const updated = await UserModel.findOneAndUpdate(
      { id },
      { role },
      { new: true },
    ).lean<UserDoc>();
    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(serializeUser(updated));
  },
);

router.delete(
  "/users/:id",
  requireAuth,
  requireAdmin,
  async (req, res): Promise<void> => {
    const id = Number(req.params["id"]);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    if (req.appUser!.id === id) {
      res.status(400).json({ error: "You cannot delete yourself" });
      return;
    }
    const deleted = await UserModel.findOneAndDelete({ id }).lean<UserDoc>();
    if (!deleted) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.sendStatus(204);
  },
);

export default router;
