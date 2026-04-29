import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/me", requireAuth, async (req, res): Promise<void> => {
  const u = req.appUser!;
  res.json({
    id: u.id,
    clerkUserId: String(u.id),
    email: u.email,
    fullName: u.fullName,
    avatarUrl: u.avatarUrl,
    role: u.role,
  });
});

export default router;
