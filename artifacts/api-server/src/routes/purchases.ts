import { Router, type IRouter } from "express";
import { PurchaseModel, type PurchaseDoc } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { optionalBrand, requireBrand } from "../middlewares/brand";

const router: IRouter = Router();

function serializePurchase(p: PurchaseDoc) {
  return {
    id: p.id,
    brand: p.brand,
    productName: p.productName,
    sku: p.sku,
    quantity: p.quantity,
    rate: Number(p.rate),
    total: Number(p.rate) * p.quantity,
    vendor: p.vendor ?? null,
    partyName: p.partyName ?? null,
    category: p.category ?? null,
    purchaseDate: new Date(p.purchaseDate).toISOString(),
    notes: p.notes ?? null,
    imageUrl: p.imageUrl ?? null,
    amazonSku: p.amazonSku ?? null,
    amazonSellingPrice:
      p.amazonSellingPrice == null ? null : Number(p.amazonSellingPrice),
    amazonGstRate:
      p.amazonGstRate == null ? null : Number(p.amazonGstRate),
    flipkartSku: p.flipkartSku ?? null,
    flipkartSellingPrice:
      p.flipkartSellingPrice == null ? null : Number(p.flipkartSellingPrice),
    flipkartGstRate:
      p.flipkartGstRate == null ? null : Number(p.flipkartGstRate),
    meeshoSku: p.meeshoSku ?? null,
    meeshoSellingPrice:
      p.meeshoSellingPrice == null ? null : Number(p.meeshoSellingPrice),
    meeshoGstRate:
      p.meeshoGstRate == null ? null : Number(p.meeshoGstRate),
    byCompany: p.byCompany ?? {},
    createdAt: new Date(p.createdAt).toISOString(),
  };
}

function sanitizeByCompany(
  raw: unknown,
): Record<string, Record<string, string | number>> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, Record<string, string | number>> = {};
  for (const [slug, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!slug || typeof slug !== "string") continue;
    if (!val || typeof val !== "object") continue;
    const obj = val as Record<string, unknown>;
    const entry: Record<string, string | number> = {};
    const strKeys = ["amazonSku", "flipkartSku", "meeshoSku"];
    const numKeys = [
      "amazonSellingPrice",
      "amazonGstRate",
      "flipkartSellingPrice",
      "flipkartGstRate",
      "meeshoSellingPrice",
      "meeshoGstRate",
    ];
    for (const k of strKeys) {
      const v = obj[k];
      if (typeof v === "string") {
        const t = v.trim();
        if (t.length > 0) entry[k] = t;
      }
    }
    for (const k of numKeys) {
      const v = obj[k];
      if (v == null || v === "") continue;
      const n = Number(v);
      if (Number.isFinite(n) && n >= 0) entry[k] = n;
    }
    if (Object.keys(entry).length > 0) {
      out[slug.toLowerCase().trim()] = entry;
    }
  }
  return out;
}

function strField(body: Record<string, unknown>, key: string): string | undefined {
  const v = body[key];
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length > 0 ? t : undefined;
}

function numField(body: Record<string, unknown>, key: string): number | undefined {
  const v = body[key];
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

router.get(
  "/purchases/product-names",
  requireAuth,
  async (req, res): Promise<void> => {
    const search =
      typeof req.query["search"] === "string"
        ? (req.query["search"] as string).trim()
        : "";
    const limitRaw = Number(req.query["limit"]);
    const limit =
      Number.isFinite(limitRaw) && limitRaw >= 1
        ? Math.min(50, Math.floor(limitRaw))
        : 20;

    const match: Record<string, unknown> = {};
    if (search) {
      const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      match["productName"] = { $regex: safe, $options: "i" };
    }

    const rows = await PurchaseModel.aggregate<{ _id: string; lastUsed: Date }>([
      ...(Object.keys(match).length > 0 ? [{ $match: match }] : []),
      {
        $group: {
          _id: "$productName",
          lastUsed: { $max: "$purchaseDate" },
        },
      },
      { $sort: { lastUsed: -1 } },
      { $limit: limit },
    ]);

    res.json({
      items: rows.map((r) => ({
        productName: r._id,
        lastUsed: r.lastUsed
          ? new Date(r.lastUsed).toISOString()
          : null,
      })),
    });
  },
);

router.get(
  "/purchases/all-companies-summary",
  requireAuth,
  async (_req, res): Promise<void> => {
    const all = await PurchaseModel.find({})
      .select({ rate: 1, quantity: 1 })
      .lean<Array<Pick<PurchaseDoc, "rate" | "quantity">>>();
    const totalCost = all.reduce(
      (acc, p) => acc + Number(p.rate) * Number(p.quantity),
      0,
    );
    const totalUnits = all.reduce(
      (acc, p) => acc + Number(p.quantity),
      0,
    );
    res.json({
      totalCost,
      totalUnits,
      totalEntries: all.length,
    });
  },
);

router.get(
  "/purchases",
  requireAuth,
  optionalBrand,
  async (req, res): Promise<void> => {
    const pageRaw = Number(req.query["page"]);
    const pageSizeRaw = Number(req.query["pageSize"]);
    const page =
      Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;
    const pageSize =
      Number.isFinite(pageSizeRaw) && pageSizeRaw >= 1
        ? Math.min(200, Math.floor(pageSizeRaw))
        : 25;
    const search =
      typeof req.query["search"] === "string"
        ? (req.query["search"] as string).trim()
        : "";
    const allCompanies =
      String(req.query["allCompanies"] ?? "") === "true";

    const filter: Record<string, unknown> = {};
    if (!allCompanies && req.brand) filter["brand"] = req.brand;
    if (search) {
      const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(safe, "i");
      filter["$or"] = [
        { productName: re },
        { sku: re },
        { vendor: re },
        { partyName: re },
        { category: re },
      ];
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

    const sortByRaw = String(req.query["sortBy"] ?? "purchaseDate");
    const sortOrder = String(req.query["sortOrder"] ?? "desc");
    const dir: 1 | -1 = sortOrder === "asc" ? 1 : -1;

    const all = await PurchaseModel.find(filter)
      .sort({ purchaseDate: -1, id: -1 })
      .lean<PurchaseDoc[]>();

    if (sortByRaw === "total") {
      all.sort((a, b) => (Number(a.rate) * a.quantity - Number(b.rate) * b.quantity) * dir);
    } else if (sortByRaw === "quantity") {
      all.sort((a, b) => (a.quantity - b.quantity) * dir);
    } else if (sortByRaw === "rate") {
      all.sort((a, b) => (Number(a.rate) - Number(b.rate)) * dir);
    } else if (sortByRaw === "productName") {
      all.sort((a, b) => a.productName.localeCompare(b.productName) * dir);
    } else if (sortByRaw === "purchaseDate" && sortOrder === "asc") {
      all.sort(
        (a, b) =>
          new Date(a.purchaseDate).getTime() -
          new Date(b.purchaseDate).getTime(),
      );
    }

    const totalCost = all.reduce(
      (acc, p) => acc + Number(p.rate) * p.quantity,
      0,
    );
    const totalUnits = all.reduce((acc, p) => acc + p.quantity, 0);
    const total = all.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const startIdx = (safePage - 1) * pageSize;
    const items = all.slice(startIdx, startIdx + pageSize);

    res.json({
      items: items.map(serializePurchase),
      totals: {
        totalCost,
        totalUnits,
        totalEntries: total,
      },
      page: safePage,
      pageSize,
      total,
      totalPages,
    });
  },
);

router.post(
  "/purchases",
  requireAuth,
  requireBrand,
  async (req, res): Promise<void> => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const productName = strField(body, "productName") ?? "";
    const sku = strField(body, "sku") ?? "";
    const quantity = Number(body["quantity"]);
    const rate = Number(body["rate"]);
    const purchaseDateRaw = body["purchaseDate"];
    const vendor = strField(body, "vendor");
    const partyName = strField(body, "partyName");
    const category = strField(body, "category");
    const notes = strField(body, "notes");
    const imageUrl = strField(body, "imageUrl");
    const amazonSku = strField(body, "amazonSku");
    const flipkartSku = strField(body, "flipkartSku");
    const meeshoSku = strField(body, "meeshoSku");
    const amazonSellingPrice = numField(body, "amazonSellingPrice");
    const flipkartSellingPrice = numField(body, "flipkartSellingPrice");
    const meeshoSellingPrice = numField(body, "meeshoSellingPrice");
    const amazonGstRate = numField(body, "amazonGstRate");
    const flipkartGstRate = numField(body, "flipkartGstRate");
    const meeshoGstRate = numField(body, "meeshoGstRate");

    if (!productName) {
      res.status(400).json({ error: "Product name is required" });
      return;
    }
    if (!sku) {
      res.status(400).json({ error: "SKU is required" });
      return;
    }
    if (!Number.isFinite(quantity) || quantity < 1) {
      res.status(400).json({ error: "Quantity must be at least 1" });
      return;
    }
    if (!Number.isFinite(rate) || rate < 0) {
      res.status(400).json({ error: "Rate must be a non-negative number" });
      return;
    }
    const purchaseDate =
      typeof purchaseDateRaw === "string" ? new Date(purchaseDateRaw) : null;
    if (!purchaseDate || Number.isNaN(purchaseDate.getTime())) {
      res.status(400).json({ error: "Invalid purchaseDate" });
      return;
    }

    const byCompany = sanitizeByCompany(body["byCompany"]);
    const created = await PurchaseModel.create({
      brand: req.brand,
      productName,
      sku,
      quantity,
      rate,
      vendor,
      partyName,
      category,
      purchaseDate,
      notes,
      imageUrl,
      amazonSku,
      amazonSellingPrice,
      amazonGstRate,
      flipkartSku,
      flipkartSellingPrice,
      flipkartGstRate,
      meeshoSku,
      meeshoSellingPrice,
      meeshoGstRate,
      byCompany,
    });
    res.status(201).json(serializePurchase(created.toObject() as PurchaseDoc));
  },
);

router.put(
  "/purchases/:id",
  requireAuth,
  requireBrand,
  async (req, res): Promise<void> => {
    const id = Number(req.params["id"]);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const productName = strField(body, "productName") ?? "";
    const sku = strField(body, "sku") ?? "";
    const quantity = Number(body["quantity"]);
    const rate = Number(body["rate"]);
    const purchaseDateRaw = body["purchaseDate"];

    if (!productName) {
      res.status(400).json({ error: "Product name is required" });
      return;
    }
    if (!sku) {
      res.status(400).json({ error: "SKU is required" });
      return;
    }
    if (!Number.isFinite(quantity) || quantity < 1) {
      res.status(400).json({ error: "Quantity must be at least 1" });
      return;
    }
    if (!Number.isFinite(rate) || rate < 0) {
      res.status(400).json({ error: "Rate must be a non-negative number" });
      return;
    }
    const purchaseDate =
      typeof purchaseDateRaw === "string" ? new Date(purchaseDateRaw) : null;
    if (!purchaseDate || Number.isNaN(purchaseDate.getTime())) {
      res.status(400).json({ error: "Invalid purchaseDate" });
      return;
    }

    const update = {
      productName,
      sku,
      quantity,
      rate,
      purchaseDate,
      vendor: strField(body, "vendor") ?? null,
      partyName: strField(body, "partyName") ?? null,
      category: strField(body, "category") ?? null,
      notes: strField(body, "notes") ?? null,
      imageUrl: strField(body, "imageUrl") ?? null,
      amazonSku: strField(body, "amazonSku") ?? null,
      amazonSellingPrice: numField(body, "amazonSellingPrice") ?? null,
      amazonGstRate: numField(body, "amazonGstRate") ?? null,
      flipkartSku: strField(body, "flipkartSku") ?? null,
      flipkartSellingPrice: numField(body, "flipkartSellingPrice") ?? null,
      flipkartGstRate: numField(body, "flipkartGstRate") ?? null,
      meeshoSku: strField(body, "meeshoSku") ?? null,
      meeshoSellingPrice: numField(body, "meeshoSellingPrice") ?? null,
      meeshoGstRate: numField(body, "meeshoGstRate") ?? null,
      byCompany: sanitizeByCompany(body["byCompany"]),
    };

    const updated = await PurchaseModel.findOneAndUpdate(
      { brand: req.brand, id },
      { $set: update },
      { new: true },
    ).lean<PurchaseDoc>();

    if (!updated) {
      res.status(404).json({ error: "Purchase not found" });
      return;
    }
    res.json(serializePurchase(updated));
  },
);

router.delete(
  "/purchases/:id",
  requireAuth,
  requireBrand,
  async (req, res): Promise<void> => {
    const id = Number(req.params["id"]);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const deleted = await PurchaseModel.findOneAndDelete({
      brand: req.brand,
      id,
    }).lean<PurchaseDoc>();
    if (!deleted) {
      res.status(404).json({ error: "Purchase not found" });
      return;
    }
    res.sendStatus(204);
  },
);

export default router;
