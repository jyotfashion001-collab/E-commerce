import { Router, type IRouter } from "express";
import { OrderModel, InventoryModel, type OrderDoc, type Brand } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { requireBrand } from "../middlewares/brand";

const router: IRouter = Router();

const PLATFORMS = ["meesho", "flipkart", "amazon"] as const;
type Platform = (typeof PLATFORMS)[number];

function isPlatform(v: unknown): v is Platform {
  return typeof v === "string" && (PLATFORMS as readonly string[]).includes(v);
}

function serializeOrder(o: OrderDoc) {
  return {
    id: o.id,
    brand: o.brand,
    platform: o.platform,
    productName: o.productName,
    sku: o.sku,
    quantity: o.quantity,
    price: Number(o.price),
    orderDate: new Date(o.orderDate).toISOString(),
    subOrderNo: o.subOrderNo ?? null,
    orderSource: o.orderSource ?? null,
    reasonForCredit: o.reasonForCredit ?? null,
    createdAt: new Date(o.createdAt).toISOString(),
  };
}

async function decrementInventory(
  brand: Brand,
  platform: Platform,
  sku: string,
  qty: number,
  productName: string,
  unitPrice: number,
) {
  const existing = await InventoryModel.findOne({ brand, platform, sku });
  if (existing) {
    existing.quantity = Math.max(0, existing.quantity - qty);
    await existing.save();
  } else {
    await InventoryModel.create({
      brand,
      platform,
      sku,
      productName,
      quantity: 0,
      price: unitPrice,
    });
  }
}

router.post("/orders/bulk-delete", requireAuth, requireBrand, async (req, res): Promise<void> => {
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
  const result = await OrderModel.deleteMany({ brand: req.brand, id: { $in: ids } });
  res.json({ deleted: result.deletedCount ?? 0 });
});

router.get("/orders", requireAuth, requireBrand, async (req, res): Promise<void> => {
  const platformRaw = String(req.query["platform"] ?? "all");
  const search = (req.query["search"] as string | undefined)?.trim();
  const sortBy = String(req.query["sortBy"] ?? "orderDate");
  const sortOrder = String(req.query["sortOrder"] ?? "desc");
  const page = Math.max(1, Number(req.query["page"] ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(req.query["pageSize"] ?? 20)));

  const filter: Record<string, unknown> = { brand: req.brand };
  if (isPlatform(platformRaw)) {
    filter["platform"] = platformRaw;
  }
  if (search && search.length > 0) {
    const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter["$or"] = [{ productName: re }, { sku: re }];
  }

  const orderDateFromRaw = req.query["orderDateFrom"];
  const orderDateToRaw = req.query["orderDateTo"];
  const dateFilter: Record<string, Date> = {};
  if (typeof orderDateFromRaw === "string" && orderDateFromRaw.length > 0) {
    const d = new Date(orderDateFromRaw);
    if (!Number.isNaN(d.getTime())) dateFilter["$gte"] = d;
  }
  if (typeof orderDateToRaw === "string" && orderDateToRaw.length > 0) {
    const d = new Date(orderDateToRaw);
    if (!Number.isNaN(d.getTime())) dateFilter["$lte"] = d;
  }
  if (Object.keys(dateFilter).length > 0) {
    filter["orderDate"] = dateFilter;
  }

  const sortColMap: Record<string, string> = {
    orderDate: "orderDate",
    price: "price",
    quantity: "quantity",
    productName: "productName",
  };
  const sortField = sortColMap[sortBy] ?? "orderDate";
  const sort: Record<string, 1 | -1> = { [sortField]: sortOrder === "asc" ? 1 : -1 };

  const total = await OrderModel.countDocuments(filter);
  const items = await OrderModel.find(filter)
    .sort(sort)
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .lean<OrderDoc[]>();

  res.json({
    items: items.map(serializeOrder),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
});

router.post("/orders", requireAuth, requireBrand, async (req, res): Promise<void> => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const platform = body["platform"];
  const productName = body["productName"];
  const sku = body["sku"];
  const quantity = Number(body["quantity"]);
  const price = Number(body["price"]);
  const orderDateRaw = body["orderDate"];

  if (
    !isPlatform(platform) ||
    typeof productName !== "string" ||
    typeof sku !== "string" ||
    !Number.isFinite(quantity) ||
    !Number.isFinite(price) ||
    typeof orderDateRaw !== "string"
  ) {
    res.status(400).json({ error: "Invalid order payload" });
    return;
  }

  const created = await OrderModel.create({
    brand: req.brand,
    platform,
    productName,
    sku,
    quantity,
    price,
    orderDate: new Date(orderDateRaw),
  });

  await decrementInventory(req.brand!, platform, sku, quantity, productName, price);

  res.status(201).json(serializeOrder(created.toObject() as OrderDoc));
});

router.patch("/orders/:id", requireAuth, requireBrand, async (req, res): Promise<void> => {
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
  if (typeof body["orderDate"] === "string")
    updates["orderDate"] = new Date(body["orderDate"]);

  const updated = await OrderModel.findOneAndUpdate({ brand: req.brand, id }, updates, {
    new: true,
  }).lean<OrderDoc>();
  if (!updated) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(serializeOrder(updated));
});

router.delete("/orders/:id", requireAuth, requireBrand, async (req, res): Promise<void> => {
  const id = Number(req.params["id"]);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const deleted = await OrderModel.findOneAndDelete({ brand: req.brand, id }).lean<OrderDoc>();
  if (!deleted) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
