import { Router, type IRouter } from "express";
import { PaymentModel, type PaymentDoc, PurchaseModel } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { requireBrand } from "../middlewares/brand";

const router: IRouter = Router();

const PLATFORMS = ["meesho", "flipkart", "amazon"] as const;
type Platform = (typeof PLATFORMS)[number];

function isPlatform(v: unknown): v is Platform {
  return typeof v === "string" && (PLATFORMS as readonly string[]).includes(v);
}

function num(v: unknown): number {
  if (v == null) return 0;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

const STRING_FIELDS = [
  "subOrderNo",
  "orderDate",
  "dispatchDate",
  "productName",
  "sku",
  "catalogId",
  "orderSource",
  "liveOrderStatus",
  "productGstPct",
  "listingPrice",
  "quantity",
  "transactionId",
  "paymentDate",
  "finalSettlementAmount",
  "priceType",
  "totalSaleAmount",
  "totalSaleReturnAmount",
  "fixedFee",
  "warehousingFee",
  "returnPremium",
  "returnPremiumOfReturn",
  "meeshoCommissionPct",
  "meeshoCommission",
  "meeshoGoldPlatformFee",
  "meeshoMallPlatformFee",
  "fixedFee2",
  "warehousingFee2",
  "returnShippingCharge",
  "gstCompensation",
  "shippingCharge",
  "otherSupportServiceCharges",
  "waivers",
  "netOtherSupportServiceCharges",
  "gstOnNetOtherSupportServiceCharges",
  "tcs",
  "tdsRatePct",
  "tds",
  "compensation",
  "claims",
  "recovery",
  "compensationReason",
  "claimsReason",
  "recoveryReason",
] as const;

function paymentReviewOf(o: {
  paymentDate?: string;
  liveOrderStatus?: string;
  paymentReview?: string;
}): "pending" | "success" {
  const override = (o.paymentReview ?? "").trim().toLowerCase();
  if (override === "pending" || override === "success") return override;
  const status = (o.liveOrderStatus ?? "").trim().toLowerCase();
  if (status.includes("rto") || status.includes("return")) return "pending";
  if (status === "delivered" || status.includes("delivered")) return "success";
  return "pending";
}

function normalizePaymentReview(v: unknown): "" | "pending" | "success" {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "success" || s === "paid" || s === "settled" || s === "yes" || s === "y") {
    return "success";
  }
  if (s === "pending" || s === "unpaid" || s === "no" || s === "n") {
    return "pending";
  }
  return "";
}

function serializePayment(o: PaymentDoc) {
  const out: Record<string, unknown> = {
    id: o.id,
    brand: o.brand,
    platform: o.platform,
  };
  for (const f of STRING_FIELDS) {
    out[f] = (o as unknown as Record<string, string>)[f] ?? "";
  }
  out["paymentReview"] = paymentReviewOf(o);
  return out;
}

router.get("/payments", requireAuth, requireBrand, async (req, res): Promise<void> => {
  const platformRaw = String(req.query["platform"] ?? "all");
  const search = (req.query["search"] as string | undefined)?.trim();
  const status = (req.query["status"] as string | undefined)?.trim();
  const source = (req.query["source"] as string | undefined)?.trim();
  const paymentReview = (req.query["paymentReview"] as string | undefined)?.trim();
  const page = Math.max(1, Number(req.query["page"] ?? 1));
  const pageSize = Math.min(200, Math.max(1, Number(req.query["pageSize"] ?? 25)));
  const orderDateFrom = (req.query["orderDateFrom"] as string | undefined)?.trim();
  const orderDateTo = (req.query["orderDateTo"] as string | undefined)?.trim();
  const paymentDateFrom = (req.query["paymentDateFrom"] as string | undefined)?.trim();
  const paymentDateTo = (req.query["paymentDateTo"] as string | undefined)?.trim();
  const isYmd = (s: string | undefined): s is string =>
    !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

  const filter: Record<string, unknown> = { brand: req.brand };
  if (isPlatform(platformRaw)) filter["platform"] = platformRaw;
  if (status && status !== "all") filter["liveOrderStatus"] = status;
  if (source && source !== "all") filter["orderSource"] = source;
  const andClauses: Record<string, unknown>[] = [];
  if (paymentReview === "success") {
    andClauses.push({
      $or: [
        { paymentReview: "success" },
        {
          paymentReview: { $in: ["", null] },
          liveOrderStatus: { $regex: /delivered/i },
          $nor: [{ liveOrderStatus: { $regex: /rto|return/i } }],
        },
      ],
    });
  } else if (paymentReview === "pending") {
    andClauses.push({
      $or: [
        { paymentReview: "pending" },
        {
          paymentReview: { $in: ["", null] },
          $or: [
            { liveOrderStatus: { $not: { $regex: /delivered/i } } },
            { liveOrderStatus: { $regex: /rto|return/i } },
          ],
        },
      ],
    });
  }
  if (search && search.length > 0) {
    const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    andClauses.push({
      $or: [
        { subOrderNo: re },
        { sku: re },
        { productName: re },
        { transactionId: re },
      ],
    });
  }
  if (isYmd(orderDateFrom) || isYmd(orderDateTo)) {
    const range: Record<string, string> = {};
    if (isYmd(orderDateFrom)) range["$gte"] = orderDateFrom;
    if (isYmd(orderDateTo)) range["$lte"] = `${orderDateTo} 23:59:59`;
    andClauses.push({ orderDate: range });
  }
  if (isYmd(paymentDateFrom) || isYmd(paymentDateTo)) {
    const range: Record<string, string> = {};
    if (isYmd(paymentDateFrom)) range["$gte"] = paymentDateFrom;
    if (isYmd(paymentDateTo)) range["$lte"] = `${paymentDateTo} 23:59:59`;
    andClauses.push({ paymentDate: range });
  }
  if (andClauses.length > 0) {
    filter["$and"] = andClauses;
  }

  const isSuccessExpr = {
    $or: [
      { $eq: ["$paymentReview", "success"] },
      {
        $and: [
          { $in: ["$paymentReview", ["", null, undefined]] },
          {
            $regexMatch: {
              input: { $ifNull: ["$liveOrderStatus", ""] },
              regex: "delivered",
              options: "i",
            },
          },
          {
            $not: {
              $regexMatch: {
                input: { $ifNull: ["$liveOrderStatus", ""] },
                regex: "rto|return",
                options: "i",
              },
            },
          },
        ],
      },
    ],
  };

  const isRtoExpr = {
    $regexMatch: {
      input: { $ifNull: ["$liveOrderStatus", ""] },
      regex: "rto",
      options: "i",
    },
  };

  const isReturnExpr = {
    $and: [
      {
        $regexMatch: {
          input: { $ifNull: ["$liveOrderStatus", ""] },
          regex: "return",
          options: "i",
        },
      },
      { $not: isRtoExpr },
    ],
  };

  const summaryAggPromise = PaymentModel.aggregate<{
    count: number;
    settlement: number;
    saleAmount: number;
    commission: number;
    shipping: number;
    returnShipping: number;
    tds: number;
    tcs: number;
    compensation: number;
    claims: number;
    recovery: number;
    successCount: number;
    successAmount: number;
    pendingCount: number;
    pendingAmount: number;
    rtoCount: number;
    returnCount: number;
    returnSettlement: number;
  }>([
    { $match: filter },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        settlement: { $sum: "$finalSettlementAmountNum" },
        returnSettlement: {
          $sum: { $cond: [isReturnExpr, "$finalSettlementAmountNum", 0] },
        },
        saleAmount: { $sum: "$totalSaleAmountNum" },
        commission: { $sum: "$meeshoCommissionNum" },
        shipping: { $sum: "$shippingChargeNum" },
        returnShipping: { $sum: "$returnShippingChargeNum" },
        tds: { $sum: "$tdsNum" },
        tcs: { $sum: "$tcsNum" },
        compensation: { $sum: "$compensationNum" },
        claims: { $sum: "$claimsNum" },
        recovery: { $sum: "$recoveryNum" },
        successCount: {
          $sum: { $cond: [isSuccessExpr, 1, 0] },
        },
        successAmount: {
          $sum: { $cond: [isSuccessExpr, "$finalSettlementAmountNum", 0] },
        },
        pendingCount: {
          $sum: { $cond: [isSuccessExpr, 0, 1] },
        },
        pendingAmount: {
          $sum: { $cond: [isSuccessExpr, 0, "$finalSettlementAmountNum"] },
        },
        rtoCount: {
          $sum: { $cond: [isRtoExpr, 1, 0] },
        },
        returnCount: {
          $sum: { $cond: [isReturnExpr, 1, 0] },
        },
      },
    },
  ]);

  type SkuQty = { _id: { platform: PaymentDoc["platform"]; sku: string }; qty: number };
  const rtoBreakdownPromise = PaymentModel.aggregate<SkuQty>([
    { $match: { ...filter, $expr: { $regexMatch: { input: { $ifNull: ["$liveOrderStatus", ""] }, regex: "rto", options: "i" } } } },
    {
      $group: {
        _id: { platform: "$platform", sku: "$sku" },
        qty: { $sum: { $convert: { input: "$quantity", to: "double", onError: 0, onNull: 0 } } },
      },
    },
  ]);
  const returnBreakdownPromise = PaymentModel.aggregate<SkuQty>([
    {
      $match: {
        ...filter,
        $expr: {
          $and: [
            { $regexMatch: { input: { $ifNull: ["$liveOrderStatus", ""] }, regex: "return", options: "i" } },
            { $not: { $regexMatch: { input: { $ifNull: ["$liveOrderStatus", ""] }, regex: "rto", options: "i" } } },
          ],
        },
      },
    },
    {
      $group: {
        _id: { platform: "$platform", sku: "$sku" },
        qty: { $sum: { $convert: { input: "$quantity", to: "double", onError: 0, onNull: 0 } } },
      },
    },
  ]);

  const [total, items, statuses, sources, totalAll, summaryAgg, rtoBreakdown, returnBreakdown, purchases] =
    await Promise.all([
      PaymentModel.countDocuments(filter),
      PaymentModel.find(filter)
        .sort({ createdAt: -1, id: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean<PaymentDoc[]>(),
      PaymentModel.distinct("liveOrderStatus", { brand: req.brand }),
      PaymentModel.distinct("orderSource", { brand: req.brand }),
      PaymentModel.countDocuments({ brand: req.brand }),
      summaryAggPromise,
      rtoBreakdownPromise,
      returnBreakdownPromise,
      PurchaseModel.find(
        { brand: req.brand },
        { rate: 1, amazonSku: 1, flipkartSku: 1, meeshoSku: 1, updatedAt: 1 },
      )
        .sort({ updatedAt: -1, id: -1 })
        .lean(),
    ]);

  const priceMap = new Map<string, number>();
  const platformSkuField: Record<PaymentDoc["platform"], "amazonSku" | "flipkartSku" | "meeshoSku"> = {
    amazon: "amazonSku",
    flipkart: "flipkartSku",
    meesho: "meeshoSku",
  };
  for (const p of purchases) {
    const rate = Number((p as { rate?: number }).rate) || 0;
    if (!rate) continue;
    for (const platform of ["amazon", "flipkart", "meesho"] as const) {
      const raw = (p as Record<string, unknown>)[platformSkuField[platform]];
      if (typeof raw !== "string" || !raw.trim()) continue;
      const skus = raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      for (const sku of skus) {
        const key = `${platform}::${sku}`;
        if (!priceMap.has(key)) priceMap.set(key, rate);
      }
    }
  }

  let rtoAmount = 0;
  for (const r of rtoBreakdown) {
    const rate = priceMap.get(`${r._id.platform}::${r._id.sku || ""}`) ?? 0;
    rtoAmount += rate * (r.qty || 0);
  }
  let returnAmount = 0;
  for (const r of returnBreakdown) {
    const rate = priceMap.get(`${r._id.platform}::${r._id.sku || ""}`) ?? 0;
    returnAmount += rate * (r.qty || 0);
  }

  const s = summaryAgg[0] ?? {
    count: 0,
    settlement: 0,
    saleAmount: 0,
    commission: 0,
    shipping: 0,
    returnShipping: 0,
    tds: 0,
    tcs: 0,
    compensation: 0,
    claims: 0,
    recovery: 0,
    successCount: 0,
    successAmount: 0,
    pendingCount: 0,
    pendingAmount: 0,
    rtoCount: 0,
    returnCount: 0,
    returnSettlement: 0,
  };

  res.json({
    items: items.map((it) => ({
      ...serializePayment(it),
      productRate: priceMap.get(`${it.platform}::${it.sku || ""}`) ?? 0,
    })),
    total,
    totalAll,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    summary: {
      count: s.count,
      settlement: s.settlement,
      saleAmount: s.saleAmount,
      commission: s.commission,
      shipping: s.shipping + s.returnShipping,
      shippingForward: s.shipping,
      shippingReturn: s.returnShipping,
      tds: s.tds,
      tcs: s.tcs,
      compensation: s.compensation,
      claims: s.claims,
      recovery: s.recovery,
      successCount: s.successCount,
      successAmount: s.successAmount,
      pendingCount: s.pendingCount,
      pendingAmount: s.pendingAmount,
      rtoCount: s.rtoCount,
      rtoAmount,
      returnCount: s.returnCount,
      returnAmount,
      returnSettlement: s.returnSettlement,
    },
    facets: {
      statuses: (statuses as string[]).filter((x) => x && x.length > 0).sort(),
      sources: (sources as string[]).filter((x) => x && x.length > 0).sort(),
    },
  });
});

router.post("/payments/upload", requireAuth, requireBrand, async (req, res): Promise<void> => {
  const body = (req.body ?? {}) as { rows?: unknown };
  if (!Array.isArray(body.rows)) {
    res.status(400).json({ error: "rows must be an array" });
    return;
  }

  const brand = req.brand!;
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let deduped = 0;
  const errors: string[] = [];

  // Dedupe incoming rows by subOrderNo (last write wins per file)
  const indexBySub = new Map<string, number>();
  const incomingRaw = body.rows as Record<string, unknown>[];
  const cleaned: Record<string, unknown>[] = [];
  for (const r of incomingRaw) {
    const key = String(r["subOrderNo"] ?? "").trim();
    if (!key) {
      cleaned.push(r);
      continue;
    }
    if (indexBySub.has(key)) {
      cleaned[indexBySub.get(key)!] = { ...cleaned[indexBySub.get(key)!], ...r };
      deduped++;
    } else {
      indexBySub.set(key, cleaned.length);
      cleaned.push(r);
    }
  }

  for (let i = 0; i < cleaned.length; i++) {
    const raw = cleaned[i];
    try {
      if (!isPlatform(raw["platform"])) {
        throw new Error("Invalid platform");
      }

      const payload: Record<string, unknown> = {
        brand,
        platform: raw["platform"],
      };
      for (const f of STRING_FIELDS) {
        payload[f] = String(raw[f] ?? "");
      }
      if (raw["paymentReview"] !== undefined) {
        payload["paymentReview"] = normalizePaymentReview(raw["paymentReview"]);
      }
      payload["finalSettlementAmountNum"] = num(raw["finalSettlementAmount"]);
      payload["totalSaleAmountNum"] = num(raw["totalSaleAmount"]);
      payload["totalSaleReturnAmountNum"] = num(raw["totalSaleReturnAmount"]);
      payload["meeshoCommissionNum"] = num(raw["meeshoCommission"]);
      payload["shippingChargeNum"] = num(raw["shippingCharge"]);
      payload["returnShippingChargeNum"] = num(raw["returnShippingCharge"]);
      payload["tdsNum"] = num(raw["tds"]);
      payload["tcsNum"] = num(raw["tcs"]);
      payload["compensationNum"] = num(raw["compensation"]);
      payload["claimsNum"] = num(raw["claims"]);
      payload["recoveryNum"] = num(raw["recovery"]);

      const subOrderNo = String(payload["subOrderNo"] ?? "").trim();
      if (subOrderNo) {
        const existing = await PaymentModel.findOne({ brand, subOrderNo });
        if (existing) {
          Object.assign(existing, payload);
          await existing.save();
          updated++;
          continue;
        }
      }

      await PaymentModel.create(payload);
      inserted++;
    } catch (err) {
      skipped++;
      const message = err instanceof Error ? err.message : "Unknown error";
      errors.push(`Row ${i + 1}: ${message}`);
      req.log.warn({ err, row: raw }, "Failed to import payment row");
    }
  }

  res.json({ inserted, updated, skipped, deduped, errors: errors.slice(0, 20) });
});

const EDITABLE_STRING_FIELDS = [
  "subOrderNo",
  "orderDate",
  "productName",
  "sku",
  "liveOrderStatus",
  "orderSource",
  "quantity",
  "paymentDate",
  "priceType",
  "finalSettlementAmount",
  "totalSaleAmount",
  "totalSaleReturnAmount",
  "meeshoCommission",
  "shippingCharge",
  "returnShippingCharge",
  "tcs",
  "tds",
] as const;

const NUMERIC_MIRRORS: Record<string, string> = {
  finalSettlementAmount: "finalSettlementAmountNum",
  totalSaleAmount: "totalSaleAmountNum",
  totalSaleReturnAmount: "totalSaleReturnAmountNum",
  meeshoCommission: "meeshoCommissionNum",
  shippingCharge: "shippingChargeNum",
  returnShippingCharge: "returnShippingChargeNum",
  tcs: "tcsNum",
  tds: "tdsNum",
};

router.patch("/payments/:id", requireAuth, requireBrand, async (req, res): Promise<void> => {
  const id = Number(req.params["id"]);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const body = (req.body ?? {}) as Record<string, unknown>;
  const set: Record<string, unknown> = {};

  if (body["paymentReview"] !== undefined) {
    set["paymentReview"] = normalizePaymentReview(body["paymentReview"]);
  }
  for (const f of EDITABLE_STRING_FIELDS) {
    if (body[f] !== undefined) {
      const value = String(body[f] ?? "");
      set[f] = value;
      const mirror = NUMERIC_MIRRORS[f];
      if (mirror) set[mirror] = num(value);
    }
  }

  if (Object.keys(set).length === 0) {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }

  const updated = await PaymentModel.findOneAndUpdate(
    { id, brand: req.brand },
    { $set: set },
    { new: true },
  );
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(serializePayment(updated));
});

router.post(
  "/payments/delete",
  requireAuth,
  requireBrand,
  async (req, res): Promise<void> => {
    const body = (req.body ?? {}) as { ids?: unknown };
    if (!Array.isArray(body.ids)) {
      res.status(400).json({ error: "ids must be an array" });
      return;
    }
    const ids = body.ids
      .map((v) => Number(v))
      .filter((n) => Number.isFinite(n));
    if (ids.length === 0) {
      res.json({ deleted: 0 });
      return;
    }
    const result = await PaymentModel.deleteMany({
      brand: req.brand,
      id: { $in: ids },
    });
    res.json({ deleted: result.deletedCount ?? 0 });
  },
);

router.delete("/payments", requireAuth, requireBrand, async (req, res): Promise<void> => {
  const result = await PaymentModel.deleteMany({ brand: req.brand });
  res.json({ deleted: result.deletedCount ?? 0 });
});

router.get("/payments/platform-summary", requireAuth, requireBrand, async (req, res): Promise<void> => {
  const brand = req.brand;

  const isSuccessExpr = {
    $or: [
      { $eq: ["$paymentReview", "success"] },
      {
        $and: [
          { $in: ["$paymentReview", ["", null]] },
          { $regexMatch: { input: { $ifNull: ["$liveOrderStatus", ""] }, regex: "delivered", options: "i" } },
          { $not: { $regexMatch: { input: { $ifNull: ["$liveOrderStatus", ""] }, regex: "rto|return", options: "i" } } },
        ],
      },
    ],
  };
  const isRtoExpr = { $regexMatch: { input: { $ifNull: ["$liveOrderStatus", ""] }, regex: "rto", options: "i" } };
  const isReturnExpr = {
    $and: [
      { $regexMatch: { input: { $ifNull: ["$liveOrderStatus", ""] }, regex: "return", options: "i" } },
      { $not: isRtoExpr },
    ],
  };

  const groupFields = {
    totalOrders: { $sum: 1 },
    successCount: { $sum: { $cond: [isSuccessExpr, 1, 0] } },
    successAmount: { $sum: { $cond: [isSuccessExpr, "$finalSettlementAmountNum", 0] } },
    pendingCount: { $sum: { $cond: [isSuccessExpr, 0, 1] } },
    pendingAmount: { $sum: { $cond: [isSuccessExpr, 0, "$finalSettlementAmountNum"] } },
    rtoCount: { $sum: { $cond: [isRtoExpr, 1, 0] } },
    rtoAmount: { $sum: { $cond: [isRtoExpr, "$totalSaleAmountNum", 0] } },
    returnCount: { $sum: { $cond: [isReturnExpr, 1, 0] } },
    returnAmount: { $sum: { $cond: [isReturnExpr, "$totalSaleAmountNum", 0] } },
    returnSettlement: { $sum: { $cond: [isReturnExpr, "$finalSettlementAmountNum", 0] } },
    compensation: { $sum: "$compensationNum" },
    claims: { $sum: "$claimsNum" },
    recovery: { $sum: "$recoveryNum" },
  };

  const [perPlatform, allAgg] = await Promise.all([
    PaymentModel.aggregate([
      { $match: { brand } },
      { $group: { _id: "$platform", ...groupFields } },
    ]),
    PaymentModel.aggregate([
      { $match: { brand } },
      { $group: { _id: null, ...groupFields } },
    ]),
  ]);

  const zero = {
    totalOrders: 0,
    successCount: 0, successAmount: 0,
    pendingCount: 0, pendingAmount: 0,
    rtoCount: 0, rtoAmount: 0,
    returnCount: 0, returnAmount: 0,
    returnSettlement: 0,
    compensation: 0, claims: 0, recovery: 0,
  };

  const byPlatform = new Map(perPlatform.map((r: Record<string, unknown>) => [r._id as string, r]));
  const platforms = (["meesho", "flipkart", "amazon"] as const).map((p) => {
    const r = byPlatform.get(p) ?? zero;
    return { platform: p, ...zero, ...r, _id: undefined };
  });

  const all = allAgg[0] ?? zero;

  res.json({
    all: { ...zero, ...all, _id: undefined },
    platforms,
  });
});

router.get("/payments/all-companies-platform-summary", requireAuth, async (_req, res): Promise<void> => {
  const isSuccessExpr = {
    $or: [
      { $eq: ["$paymentReview", "success"] },
      {
        $and: [
          { $in: ["$paymentReview", ["", null]] },
          { $regexMatch: { input: { $ifNull: ["$liveOrderStatus", ""] }, regex: "delivered", options: "i" } },
          { $not: { $regexMatch: { input: { $ifNull: ["$liveOrderStatus", ""] }, regex: "rto|return", options: "i" } } },
        ],
      },
    ],
  };
  const isRtoExpr = { $regexMatch: { input: { $ifNull: ["$liveOrderStatus", ""] }, regex: "rto", options: "i" } };
  const isReturnExpr = {
    $and: [
      { $regexMatch: { input: { $ifNull: ["$liveOrderStatus", ""] }, regex: "return", options: "i" } },
      { $not: isRtoExpr },
    ],
  };

  const groupFields = {
    totalOrders: { $sum: 1 },
    successCount: { $sum: { $cond: [isSuccessExpr, 1, 0] } },
    successAmount: { $sum: { $cond: [isSuccessExpr, "$finalSettlementAmountNum", 0] } },
    pendingCount: { $sum: { $cond: [isSuccessExpr, 0, 1] } },
    pendingAmount: { $sum: { $cond: [isSuccessExpr, 0, "$finalSettlementAmountNum"] } },
    rtoCount: { $sum: { $cond: [isRtoExpr, 1, 0] } },
    rtoAmount: { $sum: { $cond: [isRtoExpr, "$totalSaleAmountNum", 0] } },
    returnCount: { $sum: { $cond: [isReturnExpr, 1, 0] } },
    returnAmount: { $sum: { $cond: [isReturnExpr, "$totalSaleAmountNum", 0] } },
    returnSettlement: { $sum: { $cond: [isReturnExpr, "$finalSettlementAmountNum", 0] } },
    compensation: { $sum: "$compensationNum" },
    claims: { $sum: "$claimsNum" },
    recovery: { $sum: "$recoveryNum" },
  };

  const allAgg = await PaymentModel.aggregate([
    { $group: { _id: null, ...groupFields } },
  ]);

  const zero = {
    totalOrders: 0,
    successCount: 0, successAmount: 0,
    pendingCount: 0, pendingAmount: 0,
    rtoCount: 0, rtoAmount: 0,
    returnCount: 0, returnAmount: 0,
    returnSettlement: 0,
    compensation: 0, claims: 0, recovery: 0,
  };

  const all = allAgg[0] ?? zero;

  res.json({
    all: { ...zero, ...all, _id: undefined },
  });
});

export default router;
