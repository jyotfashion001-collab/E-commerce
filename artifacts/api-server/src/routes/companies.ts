import { Router, type IRouter } from "express";
import {
  CompanyModel,
  InventoryModel,
  OrderModel,
  COMPANY_SLUG_PATTERN,
  type CompanyDoc,
} from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

function serializeCompany(c: CompanyDoc) {
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    createdAt: new Date(c.createdAt).toISOString(),
  };
}

router.get(
  "/companies",
  requireAuth,
  async (_req, res): Promise<void> => {
    const companies = await CompanyModel.find()
      .sort({ createdAt: 1, id: 1 })
      .lean<CompanyDoc[]>();
    res.json(companies.map(serializeCompany));
  },
);

router.post(
  "/companies",
  requireAuth,
  requireAdmin,
  async (req, res): Promise<void> => {
    const body = (req.body ?? {}) as { slug?: unknown; name?: unknown };
    const slug =
      typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!slug || !COMPANY_SLUG_PATTERN.test(slug)) {
      res.status(400).json({
        error:
          "Invalid slug. Use 1-32 lowercase letters/digits/dashes (no leading/trailing dash).",
      });
      return;
    }
    if (!name || name.length > 80) {
      res.status(400).json({ error: "Name is required (max 80 characters)." });
      return;
    }

    const existing = await CompanyModel.findOne({ slug }).lean<CompanyDoc>();
    if (existing) {
      res.status(409).json({ error: `A company with slug "${slug}" already exists.` });
      return;
    }

    const created = await CompanyModel.create({ slug, name });
    res.status(201).json(serializeCompany(created.toObject()));
  },
);

router.delete(
  "/companies/:slug",
  requireAuth,
  requireAdmin,
  async (req, res): Promise<void> => {
    const slug = String(req.params["slug"] ?? "").toLowerCase();
    if (!slug) {
      res.status(400).json({ error: "Missing slug" });
      return;
    }

    // Disallow deleting the last remaining company.
    const total = await CompanyModel.estimatedDocumentCount();
    if (total <= 1) {
      res.status(409).json({
        error: "Cannot delete the last remaining company.",
      });
      return;
    }

    // Disallow deleting if it still has data.
    const [orderCount, inventoryCount] = await Promise.all([
      OrderModel.countDocuments({ brand: slug }),
      InventoryModel.countDocuments({ brand: slug }),
    ]);
    if (orderCount > 0 || inventoryCount > 0) {
      res.status(409).json({
        error: `Cannot delete: this company still has ${orderCount} order(s) and ${inventoryCount} inventory item(s). Remove them first.`,
      });
      return;
    }

    const deleted = await CompanyModel.findOneAndDelete({ slug }).lean<CompanyDoc>();
    if (!deleted) {
      res.status(404).json({ error: "Company not found" });
      return;
    }
    res.sendStatus(204);
  },
);

export default router;
