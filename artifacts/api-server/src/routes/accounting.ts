import { Router, type IRouter } from "express";
import { OrderModel, InventoryModel, PurchaseModel } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { requireBrand } from "../middlewares/brand";
import { parseSkuList } from "../lib/sku-parser";

const router: IRouter = Router();

const PLATFORMS = ["meesho", "flipkart", "amazon"] as const;
type Platform = (typeof PLATFORMS)[number];

function isPlatform(v: unknown): v is Platform {
  return typeof v === "string" && (PLATFORMS as readonly string[]).includes(v);
}

router.get("/accounting/product-summary", requireAuth, requireBrand, async (req, res): Promise<void> => {
  const platformRaw = String(req.query["platform"] ?? "all");
  const search = (req.query["search"] as string | undefined)?.trim();
  const page = Math.max(1, Number(req.query["page"] ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(req.query["pageSize"] ?? 20)));
  const sortBy = String(req.query["sortBy"] ?? "totalRevenue");
  const sortOrder = String(req.query["sortOrder"] ?? "desc");

  const matchStage: Record<string, unknown> = { brand: req.brand };
  if (isPlatform(platformRaw)) {
    matchStage["platform"] = platformRaw;
  }

  const dateFromRaw = req.query["dateFrom"];
  const dateToRaw = req.query["dateTo"];
  const dateFilter: Record<string, Date> = {};
  if (typeof dateFromRaw === "string" && dateFromRaw.length > 0) {
    const d = new Date(dateFromRaw);
    if (!Number.isNaN(d.getTime())) dateFilter["$gte"] = d;
  }
  if (typeof dateToRaw === "string" && dateToRaw.length > 0) {
    const d = new Date(dateToRaw);
    if (!Number.isNaN(d.getTime())) dateFilter["$lte"] = d;
  }
  if (Object.keys(dateFilter).length > 0) {
    matchStage["orderDate"] = dateFilter;
  }

  if (search && search.length > 0) {
    const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    matchStage["$or"] = [{ productName: re }, { sku: re }];
  }

  const sortFieldMap: Record<string, string> = {
    totalRevenue: "totalRevenue",
    unitsSold: "unitsSold",
    orderCount: "orderCount",
    avgRate: "avgRate",
    productName: "productName",
    sku: "sku",
  };
  const sortField = sortFieldMap[sortBy] ?? "totalRevenue";
  const sortDir = sortOrder === "asc" ? 1 : -1;

  const pipeline: object[] = [
    { $match: matchStage },
    {
      $group: {
        _id: { sku: "$sku", productName: "$productName", platform: "$platform" },
        totalRevenue: { $sum: { $multiply: ["$price", "$quantity"] } },
        unitsSold: { $sum: "$quantity" },
        orderCount: { $sum: 1 },
        avgRate: { $avg: "$price" },
        lastRate: { $last: "$price" },
      },
    },
    {
      $project: {
        _id: 0,
        sku: "$_id.sku",
        productName: "$_id.productName",
        platform: "$_id.platform",
        totalRevenue: 1,
        unitsSold: 1,
        orderCount: 1,
        avgRate: 1,
        lastRate: 1,
      },
    },
    { $sort: { [sortField]: sortDir } },
  ];

  const countPipeline = [...pipeline, { $count: "total" }];
  const dataPipeline = [...pipeline, { $skip: (page - 1) * pageSize }, { $limit: pageSize }];

  const [countResult, rows] = await Promise.all([
    OrderModel.aggregate<{ total: number }>(countPipeline),
    OrderModel.aggregate<{
      sku: string;
      productName: string;
      platform: string;
      totalRevenue: number;
      unitsSold: number;
      orderCount: number;
      avgRate: number;
      lastRate: number;
    }>(dataPipeline),
  ]);

  const total = countResult[0]?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const skus = rows.map((r) => r.sku);
  const platforms = rows.map((r) => r.platform);
  const inventoryDocs = await InventoryModel.find({
    brand: req.brand,
    sku: { $in: skus },
    platform: { $in: platforms },
  }).lean();
  const inventoryMap = new Map(
    inventoryDocs.map((i) => [`${i.platform}:${i.sku}`, {
      stockQty: i.quantity,
      imageUrl: i.imageUrl ?? null,
      mrp: i.originalPrice != null ? Number(i.originalPrice) : null,
    }]),
  );

  const platformsNeeded = new Set(rows.map((r) => r.platform));

  const purchaseOr: Record<string, unknown>[] = [];
  if (platformsNeeded.has("amazon"))
    purchaseOr.push({ amazonSku: { $nin: ["", null] } });
  if (platformsNeeded.has("flipkart"))
    purchaseOr.push({ flipkartSku: { $nin: ["", null] } });
  if (platformsNeeded.has("meesho"))
    purchaseOr.push({ meeshoSku: { $nin: ["", null] } });

  const purchaseMap = new Map<
    string,
    { rate: number; imageUrl: string | null }
  >();
  if (purchaseOr.length > 0) {
    const purchases = await PurchaseModel.find({
      brand: req.brand,
      $or: purchaseOr,
    })
      .sort({ purchaseDate: -1, createdAt: -1 })
      .lean();
    for (const p of purchases) {
      const entries: Array<[string, string | undefined]> = [
        ["amazon", p.amazonSku],
        ["flipkart", p.flipkartSku],
        ["meesho", p.meeshoSku],
      ];
      for (const [platform, mpSkuRaw] of entries) {
        if (!mpSkuRaw) continue;
        for (const mpSku of parseSkuList(mpSkuRaw)) {
          const key = `${platform}:${mpSku}`;
          if (!purchaseMap.has(key)) {
            purchaseMap.set(key, {
              rate: Number(p.rate),
              imageUrl: p.imageUrl ?? null,
            });
          }
        }
      }
    }
  }

  const items = rows.map((r) => {
    const inv = inventoryMap.get(`${r.platform}:${r.sku}`);
    const purchase = purchaseMap.get(`${r.platform}:${r.sku}`);
    const mrp = purchase?.rate ?? inv?.mrp ?? null;
    const imageUrl = purchase?.imageUrl ?? inv?.imageUrl ?? null;
    const totalMrp = mrp != null ? mrp * r.unitsSold : null;
    return {
      sku: r.sku,
      productName: r.productName,
      platform: r.platform,
      totalRevenue: r.totalRevenue,
      unitsSold: r.unitsSold,
      orderCount: r.orderCount,
      avgRate: r.avgRate,
      lastRate: r.lastRate,
      stockQty: inv?.stockQty ?? 0,
      imageUrl,
      mrp,
      totalMrp,
    };
  });

  const [summaryAgg] = await Promise.all([
    OrderModel.aggregate<{
      totalRevenue: number;
      totalOrders: number;
      totalUnits: number;
    }>([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: { $multiply: ["$price", "$quantity"] } },
          totalOrders: { $sum: 1 },
          totalUnits: { $sum: "$quantity" },
        },
      },
    ]),
  ]);
  const summary = summaryAgg[0] ?? { totalRevenue: 0, totalOrders: 0, totalUnits: 0 };

  res.json({
    items,
    total,
    page,
    pageSize,
    totalPages,
    summary: {
      totalRevenue: summary.totalRevenue,
      totalOrders: summary.totalOrders,
      totalUnits: summary.totalUnits,
      distinctProducts: total,
    },
  });
});

export default router;
