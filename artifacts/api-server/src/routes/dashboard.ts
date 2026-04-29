import { Router, type IRouter } from "express";
import {
  OrderModel,
  InventoryModel,
  CompanyModel,
  type OrderDoc,
  type CompanyDoc,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { requireBrand } from "../middlewares/brand";

const router: IRouter = Router();

const PLATFORMS = ["meesho", "flipkart", "amazon"] as const;

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
    createdAt: new Date(o.createdAt).toISOString(),
  };
}

router.get(
  "/dashboard/summary",
  requireAuth,
  requireBrand,
  async (req, res): Promise<void> => {
    const brand = req.brand;
    const totalsAgg = await OrderModel.aggregate<{
      _id: null;
      totalOrders: number;
      totalRevenue: number;
      totalUnits: number;
    }>([
      { $match: { brand } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: { $multiply: ["$price", "$quantity"] } },
          totalUnits: { $sum: "$quantity" },
        },
      },
    ]);
    const totals = totalsAgg[0] ?? { totalOrders: 0, totalRevenue: 0, totalUnits: 0 };

    const productAgg = await OrderModel.aggregate<{
      _id: { sku: string; platform: string };
      unitsSold: number;
    }>([
      { $match: { brand } },
      {
        $group: {
          _id: { sku: "$sku", platform: "$platform" },
          unitsSold: { $sum: "$quantity" },
        },
      },
    ]);
    const distinctProducts = productAgg.length;

    let totalMrp = 0;
    if (productAgg.length > 0) {
      const skus = productAgg.map((r) => r._id.sku);
      const platforms = productAgg.map((r) => r._id.platform);
      const inventoryDocs = await InventoryModel.find({
        brand,
        sku: { $in: skus },
        platform: { $in: platforms },
      }).lean();
      const mrpMap = new Map<string, number>();
      for (const i of inventoryDocs) {
        if (i.originalPrice != null) {
          mrpMap.set(`${i.platform}:${i.sku}`, Number(i.originalPrice));
        }
      }
      for (const r of productAgg) {
        const mrp = mrpMap.get(`${r._id.platform}:${r._id.sku}`);
        if (mrp != null) totalMrp += mrp * r.unitsSold;
      }
    }
    const totalAmount = totals.totalRevenue - totalMrp;

    const inventoryAgg = await InventoryModel.aggregate<{
      _id: null;
      units: number;
      skus: number;
    }>([
      { $match: { brand } },
      {
        $group: {
          _id: null,
          units: { $sum: "$quantity" },
          uniqueSkus: { $addToSet: "$sku" },
        },
      },
      {
        $project: {
          units: 1,
          skus: { $size: "$uniqueSkus" },
        },
      },
    ]);
    const inventory = inventoryAgg[0] ?? { units: 0, skus: 0 };

    const platformAgg = await OrderModel.aggregate<{
      _id: string;
      orders: number;
      revenue: number;
      units: number;
    }>([
      { $match: { brand } },
      {
        $group: {
          _id: "$platform",
          orders: { $sum: 1 },
          revenue: { $sum: { $multiply: ["$price", "$quantity"] } },
          units: { $sum: "$quantity" },
        },
      },
    ]);
    const byPlatform = new Map(platformAgg.map((r) => [r._id, r]));
    const platforms = PLATFORMS.map((p) => {
      const row = byPlatform.get(p);
      return {
        platform: p,
        orders: row?.orders ?? 0,
        revenue: row?.revenue ?? 0,
        units: row?.units ?? 0,
      };
    });

    res.json({
      totalOrders: totals.totalOrders,
      totalRevenue: totals.totalRevenue,
      totalMrp,
      totalAmount,
      totalUnits: totals.totalUnits,
      distinctProducts,
      inventoryUnits: inventory.units,
      distinctSkus: inventory.skus,
      platforms,
    });
  },
);

router.get(
  "/dashboard/revenue",
  requireAuth,
  requireBrand,
  async (req, res): Promise<void> => {
    const brand = req.brand;
    const daysRaw = Number(req.query["days"] ?? 30);
    const days = Number.isFinite(daysRaw) ? Math.min(90, Math.max(7, daysRaw)) : 30;

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setUTCDate(start.getUTCDate() - (days - 1));

    const rows = await OrderModel.aggregate<{
      _id: string;
      revenue: number;
      orders: number;
    }>([
      { $match: { brand, orderDate: { $gte: start } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$orderDate" },
          },
          revenue: { $sum: { $multiply: ["$price", "$quantity"] } },
          orders: { $sum: 1 },
        },
      },
    ]);
    const map = new Map(rows.map((r) => [r._id, r]));
    const items: Array<{ date: string; revenue: number; orders: number }> = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      const row = map.get(key);
      items.push({
        date: key,
        revenue: row?.revenue ?? 0,
        orders: row?.orders ?? 0,
      });
    }
    res.json(items);
  },
);

router.get(
  "/dashboard/recent-orders",
  requireAuth,
  requireBrand,
  async (req, res): Promise<void> => {
    const limitRaw = Number(req.query["limit"] ?? 6);
    const limit = Number.isFinite(limitRaw)
      ? Math.min(20, Math.max(1, limitRaw))
      : 6;
    const orders = await OrderModel.find({ brand: req.brand })
      .sort({ orderDate: -1 })
      .limit(limit)
      .lean<OrderDoc[]>();
    res.json(orders.map(serializeOrder));
  },
);

router.get(
  "/dashboard/top-skus",
  requireAuth,
  requireBrand,
  async (req, res): Promise<void> => {
    const brand = req.brand;
    const limitRaw = Number(req.query["limit"] ?? 5);
    const limit = Number.isFinite(limitRaw)
      ? Math.min(20, Math.max(1, limitRaw))
      : 5;
    const rows = await OrderModel.aggregate<{
      _id: { sku: string; productName: string; platform: string };
      units: number;
      revenue: number;
    }>([
      { $match: { brand } },
      {
        $group: {
          _id: {
            sku: "$sku",
            productName: "$productName",
            platform: "$platform",
          },
          units: { $sum: "$quantity" },
          revenue: { $sum: { $multiply: ["$price", "$quantity"] } },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: limit },
    ]);
    res.json(
      rows.map((r) => ({
        sku: r._id.sku,
        productName: r._id.productName,
        platform: r._id.platform,
        units: r.units,
        revenue: r.revenue,
      })),
    );
  },
);

/**
 * Per-company dashboard summary across ALL companies. Does NOT take an
 * X-Brand header — returns one row per company so the dashboard can show
 * a side-by-side comparison and a grand total.
 */
router.get(
  "/dashboard/all-companies",
  requireAuth,
  async (_req, res): Promise<void> => {
    const companies = await CompanyModel.find()
      .sort({ createdAt: 1, id: 1 })
      .lean<CompanyDoc[]>();

    type Row = {
      _id: string;
      orders: number;
      revenue: number;
      units: number;
    };
    type InvRow = {
      _id: string;
      units: number;
      uniqueSkus: string[];
    };

    const [orderRows, inventoryRows] = await Promise.all([
      OrderModel.aggregate<Row>([
        {
          $group: {
            _id: "$brand",
            orders: { $sum: 1 },
            revenue: { $sum: { $multiply: ["$price", "$quantity"] } },
            units: { $sum: "$quantity" },
          },
        },
      ]),
      InventoryModel.aggregate<InvRow>([
        {
          $group: {
            _id: "$brand",
            units: { $sum: "$quantity" },
            uniqueSkus: { $addToSet: "$sku" },
          },
        },
      ]),
    ]);

    const ordersByBrand = new Map(orderRows.map((r) => [r._id, r]));
    const inventoryByBrand = new Map(inventoryRows.map((r) => [r._id, r]));

    const items = companies.map((c) => {
      const o = ordersByBrand.get(c.slug);
      const inv = inventoryByBrand.get(c.slug);
      return {
        slug: c.slug,
        name: c.name,
        totalOrders: o?.orders ?? 0,
        totalRevenue: o?.revenue ?? 0,
        totalUnits: o?.units ?? 0,
        inventoryUnits: inv?.units ?? 0,
        distinctSkus: inv?.uniqueSkus.length ?? 0,
      };
    });

    const totals = items.reduce(
      (acc, r) => {
        acc.totalOrders += r.totalOrders;
        acc.totalRevenue += r.totalRevenue;
        acc.totalUnits += r.totalUnits;
        acc.inventoryUnits += r.inventoryUnits;
        return acc;
      },
      { totalOrders: 0, totalRevenue: 0, totalUnits: 0, inventoryUnits: 0 },
    );

    res.json({ items, totals });
  },
);

export default router;
