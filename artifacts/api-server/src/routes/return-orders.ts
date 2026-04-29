import { Router, type IRouter } from "express";
import { ReturnOrderModel, type ReturnOrderDoc } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { requireBrand } from "../middlewares/brand";

const router: IRouter = Router();

const PLATFORMS = ["meesho", "flipkart", "amazon"] as const;
type Platform = (typeof PLATFORMS)[number];

function isPlatform(v: unknown): v is Platform {
  return typeof v === "string" && (PLATFORMS as readonly string[]).includes(v);
}

function serializeReturn(o: ReturnOrderDoc) {
  return {
    id: o.id,
    brand: o.brand,
    platform: o.platform,
    sku: o.sku ?? "",
    qty: o.qty ?? "",
    orderNumber: o.orderNumber ?? "",
    returnCreatedDate: o.returnCreatedDate ?? "",
    typeOfReturn: o.typeOfReturn ?? "",
    expectedDeliveryDate: o.expectedDeliveryDate ?? "",
    courierPartner: o.courierPartner ?? "",
    status: o.status ?? "",
    trackingLink: o.trackingLink ?? "",
    returnPriceType: o.returnPriceType ?? "",
  };
}

function isCancelledReturnStatus(status: string | undefined | null): boolean {
  if (!status) return false;
  return status.toLowerCase().includes("cancel");
}

router.get("/return-orders", requireAuth, requireBrand, async (req, res): Promise<void> => {
  const platformRaw = String(req.query["platform"] ?? "all");
  const search = (req.query["search"] as string | undefined)?.trim();
  const status = (req.query["status"] as string | undefined)?.trim();
  const typeOfReturn = (req.query["typeOfReturn"] as string | undefined)?.trim();
  const page = Math.max(1, Number(req.query["page"] ?? 1));
  const pageSize = Math.min(200, Math.max(1, Number(req.query["pageSize"] ?? 25)));

  const filter: Record<string, unknown> = { brand: req.brand };
  if (isPlatform(platformRaw)) filter["platform"] = platformRaw;
  if (status && status !== "all") filter["status"] = status;
  if (typeOfReturn && typeOfReturn !== "all") filter["typeOfReturn"] = typeOfReturn;

  if (search && search.length > 0) {
    const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter["$or"] = [{ sku: re }, { orderNumber: re }, { courierPartner: re }];
  }

  const [total, items, statuses, types, totalAll] = await Promise.all([
    ReturnOrderModel.countDocuments(filter),
    ReturnOrderModel.find(filter)
      .sort({ createdAt: -1, id: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean<ReturnOrderDoc[]>(),
    ReturnOrderModel.distinct("status", { brand: req.brand }),
    ReturnOrderModel.distinct("typeOfReturn", { brand: req.brand }),
    ReturnOrderModel.countDocuments({ brand: req.brand }),
  ]);

  res.json({
    items: items.map(serializeReturn),
    total,
    totalAll,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    facets: {
      statuses: (statuses as string[]).filter((s) => s && s.length > 0).sort(),
      types: (types as string[]).filter((s) => s && s.length > 0).sort(),
    },
  });
});

router.post("/return-orders/upload", requireAuth, requireBrand, async (req, res): Promise<void> => {
  const body = (req.body ?? {}) as { rows?: unknown };
  if (!Array.isArray(body.rows)) {
    res.status(400).json({ error: "rows must be an array" });
    return;
  }

  const brand = req.brand!;
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let cancelled = 0;
  const errors: string[] = [];

  for (let i = 0; i < body.rows.length; i++) {
    const raw = body.rows[i] as Record<string, unknown>;
    try {
      if (!isPlatform(raw["platform"])) {
        throw new Error("Invalid platform");
      }
      const status = String(raw["status"] ?? "");
      if (isCancelledReturnStatus(status)) {
        cancelled++;
        continue;
      }

      const orderNumber = String(raw["orderNumber"] ?? "").trim();
      const payload = {
        brand,
        platform: raw["platform"],
        sku: String(raw["sku"] ?? ""),
        qty: String(raw["qty"] ?? ""),
        orderNumber,
        returnCreatedDate: String(raw["returnCreatedDate"] ?? ""),
        typeOfReturn: String(raw["typeOfReturn"] ?? ""),
        expectedDeliveryDate: String(raw["expectedDeliveryDate"] ?? ""),
        courierPartner: String(raw["courierPartner"] ?? ""),
        status,
        trackingLink: String(raw["trackingLink"] ?? ""),
        returnPriceType: String(raw["returnPriceType"] ?? ""),
      };

      if (orderNumber) {
        const existing = await ReturnOrderModel.findOne({ brand, orderNumber });
        if (existing) {
          Object.assign(existing, payload);
          await existing.save();
          updated++;
          continue;
        }
      }

      await ReturnOrderModel.create(payload);
      inserted++;
    } catch (err) {
      skipped++;
      const message = err instanceof Error ? err.message : "Unknown error";
      errors.push(`Row ${i + 1}: ${message}`);
      req.log.warn({ err, row: raw }, "Failed to import return-order row");
    }
  }

  res.json({ inserted, updated, skipped, cancelled, errors: errors.slice(0, 20) });
});

router.delete("/return-orders", requireAuth, requireBrand, async (req, res): Promise<void> => {
  const result = await ReturnOrderModel.deleteMany({ brand: req.brand });
  res.json({ deleted: result.deletedCount ?? 0 });
});

export default router;
