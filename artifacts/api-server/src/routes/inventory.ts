import { Router, type IRouter } from "express";
import { InventoryModel, type InventoryDoc } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { optionalBrand, requireBrand } from "../middlewares/brand";

const router: IRouter = Router();

const PLATFORMS = ["meesho", "flipkart", "amazon"] as const;
type Platform = (typeof PLATFORMS)[number];

function isPlatform(v: unknown): v is Platform {
  return typeof v === "string" && (PLATFORMS as readonly string[]).includes(v);
}

function serializeInventory(i: InventoryDoc) {
  const urls = Array.isArray(i.imageUrls) ? i.imageUrls.filter(Boolean) : [];
  const cover = urls[0] ?? i.imageUrl ?? null;
  return {
    id: i.id,
    brand: i.brand,
    platform: i.platform,
    productName: i.productName,
    sku: i.sku,
    quantity: i.quantity,
    price: Number(i.price),
    originalPrice: i.originalPrice == null ? null : Number(i.originalPrice),
    gstPercent: i.gstPercent == null ? null : Number(i.gstPercent),
    imageUrl: cover,
    imageUrls: urls.length > 0 ? urls : i.imageUrl ? [i.imageUrl] : [],
    purchaseDate: i.purchaseDate ? new Date(i.purchaseDate).toISOString() : null,
    updatedAt: new Date(i.updatedAt).toISOString(),
  };
}

function pickOptionalDate(v: unknown): Date | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? undefined : v;
  if (typeof v !== "string") return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function pickImageUrls(body: Record<string, unknown>): string[] | undefined {
  const v = body["imageUrls"];
  if (!Array.isArray(v)) return undefined;
  const list = v
    .filter((x): x is string => typeof x === "string" && x.length > 0)
    .slice(0, 12);
  return list;
}

function pickOptionalNumber(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

router.post("/inventory/bulk-delete", requireAuth, requireBrand, async (req, res): Promise<void> => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const idsRaw = body["ids"];
  if (!Array.isArray(idsRaw) || idsRaw.length === 0) {
    res.status(400).json({ error: "ids must be a non-empty array" });
    return;
  }
  const ids = idsRaw
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n));
  if (ids.length === 0) {
    res.status(400).json({ error: "No valid ids provided" });
    return;
  }
  const result = await InventoryModel.deleteMany({ brand: req.brand, id: { $in: ids } });
  res.json({ deleted: result.deletedCount ?? 0 });
});

router.get("/inventory/:id", requireAuth, requireBrand, async (req, res): Promise<void> => {
  const id = Number(req.params["id"]);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const item = await InventoryModel.findOne({ brand: req.brand, id }).lean<InventoryDoc>();
  if (!item) {
    res.status(404).json({ error: "Inventory item not found" });
    return;
  }
  res.json(serializeInventory(item));
});

router.get("/inventory", requireAuth, optionalBrand, async (req, res): Promise<void> => {
  const platformRaw = String(req.query["platform"] ?? "all");
  const search = (req.query["search"] as string | undefined)?.trim();
  const sortBy = String(req.query["sortBy"] ?? "purchaseDate");
  const sortOrder = String(req.query["sortOrder"] ?? "desc");
  const page = Math.max(1, Number(req.query["page"] ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(req.query["pageSize"] ?? 20)));
  const allCompanies = String(req.query["allCompanies"] ?? "") === "true";

  const filter: Record<string, unknown> = {};
  if (!allCompanies && req.brand) filter["brand"] = req.brand;
  if (isPlatform(platformRaw)) filter["platform"] = platformRaw;
  if (search && search.length > 0) {
    const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter["$or"] = [{ productName: re }, { sku: re }];
  }

  const fromRaw = req.query["purchaseDateFrom"];
  const toRaw = req.query["purchaseDateTo"];
  const dateFilter: Record<string, Date> = {};
  if (typeof fromRaw === "string" && fromRaw) {
    const d = new Date(fromRaw);
    if (!Number.isNaN(d.getTime())) dateFilter["$gte"] = d;
  }
  if (typeof toRaw === "string" && toRaw) {
    const d = new Date(toRaw);
    if (!Number.isNaN(d.getTime())) dateFilter["$lte"] = d;
  }
  if (Object.keys(dateFilter).length > 0) {
    filter["purchaseDate"] = dateFilter;
  }

  const sortColMap: Record<string, string> = {
    productName: "productName",
    sku: "sku",
    quantity: "quantity",
    price: "price",
    purchaseDate: "purchaseDate",
  };
  const sortField = sortColMap[sortBy] ?? "purchaseDate";
  const dir: 1 | -1 = sortOrder === "asc" ? 1 : -1;
  const sort: Record<string, 1 | -1> =
    sortField === "purchaseDate"
      ? { purchaseDate: dir, createdAt: dir }
      : { [sortField]: dir };

  const [total, items, aggregate] = await Promise.all([
    InventoryModel.countDocuments(filter),
    InventoryModel.find(filter)
      .sort(sort)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean<InventoryDoc[]>(),
    InventoryModel.aggregate<{
      totalCost: number;
      totalUnits: number;
    }>([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalCost: {
            $sum: { $multiply: ["$quantity", "$price"] },
          },
          totalUnits: { $sum: "$quantity" },
        },
      },
    ]),
  ]);

  const agg = aggregate[0] ?? { totalCost: 0, totalUnits: 0 };

  res.json({
    items: items.map(serializeInventory),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    totalCost: agg.totalCost,
    totalUnits: agg.totalUnits,
  });
});

router.post("/inventory", requireAuth, requireBrand, async (req, res): Promise<void> => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const platform = body["platform"];
  const productName = body["productName"];
  const sku = body["sku"];
  const quantity = Number(body["quantity"]);
  const price = Number(body["price"]);

  if (
    !isPlatform(platform) ||
    typeof productName !== "string" ||
    typeof sku !== "string" ||
    !Number.isFinite(quantity) ||
    !Number.isFinite(price)
  ) {
    res.status(400).json({ error: "Invalid inventory payload" });
    return;
  }

  const originalPrice = pickOptionalNumber(body["originalPrice"]);
  const gstPercent = pickOptionalNumber(body["gstPercent"]);
  const imageUrls = pickImageUrls(body);
  const imageUrl =
    imageUrls && imageUrls.length > 0
      ? imageUrls[0]
      : typeof body["imageUrl"] === "string" && body["imageUrl"].length > 0
      ? (body["imageUrl"] as string)
      : undefined;
  const purchaseDate = pickOptionalDate(body["purchaseDate"]);

  const existing = await InventoryModel.findOne({ brand: req.brand, platform, sku });
  if (existing) {
    existing.quantity = existing.quantity + quantity;
    existing.price = price;
    existing.productName = productName;
    if (originalPrice !== undefined) existing.originalPrice = originalPrice;
    if (gstPercent !== undefined) existing.gstPercent = gstPercent;
    if (imageUrl !== undefined) existing.imageUrl = imageUrl;
    if (imageUrls !== undefined) existing.imageUrls = imageUrls;
    if (purchaseDate !== undefined) existing.purchaseDate = purchaseDate;
    await existing.save();
    res.status(201).json(serializeInventory(existing.toObject() as InventoryDoc));
    return;
  }
  const created = await InventoryModel.create({
    brand: req.brand,
    platform,
    productName,
    sku,
    quantity,
    price,
    originalPrice,
    gstPercent,
    imageUrl,
    imageUrls,
    purchaseDate,
  });
  res.status(201).json(serializeInventory(created.toObject() as InventoryDoc));
});

router.patch("/inventory/:id", requireAuth, requireBrand, async (req, res): Promise<void> => {
  const id = Number(req.params["id"]);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const body = (req.body ?? {}) as Record<string, unknown>;
  const updates: Record<string, unknown> = {};
  if (isPlatform(body["platform"])) updates["platform"] = body["platform"];
  if (typeof body["productName"] === "string") updates["productName"] = body["productName"];
  if (typeof body["sku"] === "string") updates["sku"] = body["sku"];
  if (body["quantity"] !== undefined && Number.isFinite(Number(body["quantity"])))
    updates["quantity"] = Number(body["quantity"]);
  if (body["price"] !== undefined && Number.isFinite(Number(body["price"])))
    updates["price"] = Number(body["price"]);
  if (body["originalPrice"] !== undefined) {
    const v = pickOptionalNumber(body["originalPrice"]);
    if (v !== undefined) updates["originalPrice"] = v;
  }
  if (body["gstPercent"] !== undefined) {
    const v = pickOptionalNumber(body["gstPercent"]);
    if (v !== undefined) updates["gstPercent"] = v;
  }
  if (typeof body["imageUrl"] === "string") {
    updates["imageUrl"] = body["imageUrl"];
  }
  const imageUrls = pickImageUrls(body);
  if (imageUrls !== undefined) {
    updates["imageUrls"] = imageUrls;
    updates["imageUrl"] = imageUrls[0] ?? "";
  }
  if (body["purchaseDate"] !== undefined) {
    const d = pickOptionalDate(body["purchaseDate"]);
    if (d !== undefined) updates["purchaseDate"] = d;
  }

  const updated = await InventoryModel.findOneAndUpdate({ brand: req.brand, id }, updates, {
    new: true,
  }).lean<InventoryDoc>();
  if (!updated) {
    res.status(404).json({ error: "Inventory item not found" });
    return;
  }
  res.json(serializeInventory(updated));
});

router.delete(
  "/inventory/:id",
  requireAuth,
  requireBrand,
  async (req, res): Promise<void> => {
    const id = Number(req.params["id"]);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const deleted = await InventoryModel.findOneAndDelete({ brand: req.brand, id }).lean<InventoryDoc>();
    if (!deleted) {
      res.status(404).json({ error: "Inventory item not found" });
      return;
    }
    res.sendStatus(204);
  },
);

export default router;
