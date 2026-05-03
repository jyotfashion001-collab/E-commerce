export const PAYMENTS_STORAGE_KEY = "orderhub_payments";

export type PaymentPlatform = "meesho" | "flipkart" | "amazon";

export interface PaymentRow {
  platform: PaymentPlatform;
  paymentReview?: "" | "pending" | "success";
  subOrderNo: string;
  orderDate: string;
  dispatchDate: string;
  productName: string;
  sku: string;
  catalogId: string;
  orderSource: string;
  liveOrderStatus: string;
  productGstPct: string;
  listingPrice: string;
  quantity: string;
  transactionId: string;
  paymentDate: string;
  finalSettlementAmount: string;
  priceType: string;
  totalSaleAmount: string;
  totalSaleReturnAmount: string;
  fixedFee: string;
  warehousingFee: string;
  returnPremium: string;
  returnPremiumOfReturn: string;
  meeshoCommissionPct: string;
  meeshoCommission: string;
  meeshoGoldPlatformFee: string;
  meeshoMallPlatformFee: string;
  fixedFee2: string;
  warehousingFee2: string;
  returnShippingCharge: string;
  gstCompensation: string;
  shippingCharge: string;
  otherSupportServiceCharges: string;
  waivers: string;
  netOtherSupportServiceCharges: string;
  gstOnNetOtherSupportServiceCharges: string;
  tcs: string;
  tdsRatePct: string;
  tds: string;
  compensation: string;
  claims: string;
  recovery: string;
  compensationReason: string;
  claimsReason: string;
  recoveryReason: string;
}

const PAYMENT_HEADER_ALIASES: Partial<
  Record<keyof Omit<PaymentRow, "platform">, string[]>
> = {
  subOrderNo: [
    "sub order no",
    "sub-order id",
    "sub order id",
    "order item id",
    "order id",
    "order no",
    "order number",
    "amazon-order-id",
    "amazon order id",
    "fk order id",
  ],
  orderDate: ["order date", "purchase-date", "purchase date", "ordered-on"],
  dispatchDate: ["dispatch date", "dispatch-date", "shipped-date", "ship date"],
  productName: ["product name", "product-name", "title", "item description"],
  sku: ["supplier sku", "sku", "seller sku", "merchant sku", "msku", "fsn"],
  catalogId: ["catalog id", "asin", "fsn", "product id"],
  orderSource: ["order source", "sales channel", "channel", "source"],
  liveOrderStatus: [
    "live order status",
    "order status",
    "status",
    "fulfillment status",
    "item-status",
  ],
  productGstPct: ["product gst %", "gst %", "tax rate"],
  listingPrice: [
    "listing price (incl. taxes)",
    "listing price",
    "selling price",
    "item-price",
    "mrp",
  ],
  quantity: ["quantity", "qty", "units", "quantity-purchased"],
  transactionId: [
    "transaction id",
    "transaction-id",
    "settlement id",
    "payment id",
  ],
  paymentDate: [
    "payment date",
    "payment-date",
    "settlement date",
    "deposit-date",
    "posted-date",
  ],
  finalSettlementAmount: [
    "final settlement amount",
    "settlement value",
    "net settlement value",
    "total amount",
    "total",
    "net amount",
  ],
  priceType: ["price type", "promotion type", "fulfillment"],
  totalSaleAmount: [
    "total sale amount (incl. shipping & gst)",
    "total sale amount",
    "invoice value",
    "item-price",
    "sale amount",
  ],
  totalSaleReturnAmount: [
    "total sale return amount (incl. shipping & gst)",
    "return amount",
    "refund amount",
    "refund-amount",
  ],
  returnPremium: ["return premium (incl gst)", "return premium"],
  returnPremiumOfReturn: ["return premium (incl gst) of return"],
  meeshoCommissionPct: [
    "meesho commission percentage",
    "commission %",
    "commission percentage",
  ],
  meeshoCommission: [
    "meesho commission (incl. gst)",
    "commission",
    "marketplace fee",
    "referral fee",
    "commission charges",
  ],
  meeshoGoldPlatformFee: [
    "meesho gold platform fee (incl. gst)",
    "platform fee",
  ],
  meeshoMallPlatformFee: ["meesho mall platform fee (incl. gst)"],
  returnShippingCharge: [
    "return shipping charge (incl. gst)",
    "return shipping",
    "reverse shipping",
    "reverse-shipment-fee",
  ],
  gstCompensation: ["gst compensation (prp shipping)"],
  shippingCharge: [
    "shipping charge (incl. gst)",
    "shipping fee",
    "shipping charges",
    "forward shipping",
    "shipping-charge",
  ],
  otherSupportServiceCharges: [
    "other support service charges (excl. gst)",
    "service fees",
    "other charges",
  ],
  waivers: ["waivers (excl. gst)", "waiver", "discount", "promotion"],
  netOtherSupportServiceCharges: [
    "net other support service charges (excl. gst)",
  ],
  gstOnNetOtherSupportServiceCharges: [
    "gst on net other support service charges",
  ],
  tcs: ["tcs", "tcs amount"],
  tdsRatePct: ["tds rate %", "tds %"],
  tds: ["tds", "tds amount"],
  compensation: ["compensation", "claims and compensation"],
  claims: ["claims", "claim amount"],
  recovery: ["recovery", "recovery amount"],
  compensationReason: ["compensation reason"],
  claimsReason: ["claims reason"],
  recoveryReason: ["recovery reason"],
  paymentReview: [
    "payment review",
    "payment-review",
    "payment status",
    "review",
    "review status",
  ],
};

const COLUMN_MAP: Record<string, keyof Omit<PaymentRow, "platform">> = (() => {
  const map: Record<string, keyof Omit<PaymentRow, "platform">> = {};
  (Object.keys(PAYMENT_HEADER_ALIASES) as Array<
    keyof Omit<PaymentRow, "platform">
  >).forEach((field) => {
    for (const alias of PAYMENT_HEADER_ALIASES[field] ?? []) {
      const key = alias.toLowerCase();
      if (!map[key]) map[key] = field;
    }
  });
  return map;
})();

function emptyRow(platform: PaymentPlatform = "meesho"): PaymentRow {
  return {
    platform,
    subOrderNo: "",
    orderDate: "",
    dispatchDate: "",
    productName: "",
    sku: "",
    catalogId: "",
    orderSource: "",
    liveOrderStatus: "",
    productGstPct: "",
    listingPrice: "",
    quantity: "",
    transactionId: "",
    paymentDate: "",
    finalSettlementAmount: "",
    priceType: "",
    totalSaleAmount: "",
    totalSaleReturnAmount: "",
    fixedFee: "",
    warehousingFee: "",
    returnPremium: "",
    returnPremiumOfReturn: "",
    meeshoCommissionPct: "",
    meeshoCommission: "",
    meeshoGoldPlatformFee: "",
    meeshoMallPlatformFee: "",
    fixedFee2: "",
    warehousingFee2: "",
    returnShippingCharge: "",
    gstCompensation: "",
    shippingCharge: "",
    otherSupportServiceCharges: "",
    waivers: "",
    netOtherSupportServiceCharges: "",
    gstOnNetOtherSupportServiceCharges: "",
    tcs: "",
    tdsRatePct: "",
    tds: "",
    compensation: "",
    claims: "",
    recovery: "",
    compensationReason: "",
    claimsReason: "",
    recoveryReason: "",
  };
}

export function loadPaymentRows(): PaymentRow[] {
  try {
    const raw = localStorage.getItem(PAYMENTS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PaymentRow[]) : [];
  } catch {
    return [];
  }
}

export function savePaymentRows(rows: PaymentRow[]) {
  try {
    localStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(rows));
  } catch {
    /* ignore */
  }
}

export interface ParseResult {
  ok: true;
  rows: PaymentRow[];
}
export interface ParseError {
  ok: false;
  error: string;
}

export async function parsePaymentsFile(
  file: File,
  platform: PaymentPlatform = "meesho",
): Promise<ParseResult | ParseError> {
  const XLSX = await import("xlsx");
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { cellDates: false });

  let bestSheet: string | null = null;
  let bestHeaderIdx = -1;
  let bestRows: string[][] = [];
  let bestMatches = 0;
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, {
      defval: "",
      raw: false,
      header: 1,
    }) as string[][];
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const lowered = rows[i].map((c) => String(c).trim().toLowerCase());
      const matches = lowered.filter((h) => h && COLUMN_MAP[h]).length;
      if (matches > bestMatches) {
        bestMatches = matches;
        bestSheet = sheetName;
        bestHeaderIdx = i;
        bestRows = rows;
      }
    }
  }

  if (!bestSheet || bestHeaderIdx === -1 || bestMatches < 3) {
    return {
      ok: false,
      error:
        "Could not find recognizable payment columns. Expected a header row with Sub Order No / Order ID, Settlement, Commission, etc.",
    };
  }

  const headers = bestRows[bestHeaderIdx].map((h) =>
    String(h).trim().toLowerCase(),
  );

  const subIdx = headers.findIndex((h) => COLUMN_MAP[h] === "subOrderNo");

  const dataStart = bestHeaderIdx + 1;
  const dataRows = bestRows.slice(dataStart).filter((row) => {
    if (!row.some((v) => v !== "" && v !== null && v !== undefined))
      return false;
    if (subIdx === -1) return true;
    const sub = String(row[subIdx] ?? "").trim();
    if (!sub) return false;
    if (/^[A-Z]\s*[+=]/i.test(sub)) return false;
    if (/^[A-Z]+(\s*[+\-*/=]\s*[A-Z]+)+/.test(sub)) return false;
    return true;
  });

  const parsed: PaymentRow[] = dataRows.map((row) => {
    const mapped: Record<string, string> = {};
    headers.forEach((h, i) => {
      const key = COLUMN_MAP[h];
      if (key && !mapped[key]) {
        mapped[key] = String(row[i] ?? "").trim();
      }
    });
    return { ...emptyRow(platform), ...mapped, platform } as PaymentRow;
  });

  if (parsed.length === 0) {
    return { ok: false, error: "Found headers but no payment rows." };
  }

  return { ok: true, rows: parsed };
}

export interface MergeResult {
  rows: PaymentRow[];
  inserted: number;
  updated: number;
  deduped: number;
}

function dedupeBySubOrder(rows: PaymentRow[]): {
  rows: PaymentRow[];
  removed: number;
} {
  const seen = new Map<string, number>();
  const result: PaymentRow[] = [];
  let removed = 0;
  for (const row of rows) {
    const key = (row.subOrderNo ?? "").trim();
    if (!key) {
      result.push(row);
      continue;
    }
    if (seen.has(key)) {
      const idx = seen.get(key)!;
      result[idx] = { ...result[idx], ...row };
      removed++;
    } else {
      seen.set(key, result.length);
      result.push(row);
    }
  }
  return { rows: result, removed };
}

export function mergePaymentRows(
  existing: PaymentRow[],
  incoming: PaymentRow[],
): MergeResult {
  const cleanedExisting = dedupeBySubOrder(existing);
  const cleanedIncoming = dedupeBySubOrder(incoming);

  let inserted = 0;
  let updated = 0;

  const indexBySub = new Map<string, number>();
  cleanedExisting.rows.forEach((r, idx) => {
    const key = (r.subOrderNo ?? "").trim();
    if (key) indexBySub.set(key, idx);
  });

  const merged = [...cleanedExisting.rows];
  for (const row of cleanedIncoming.rows) {
    const key = (row.subOrderNo ?? "").trim();
    if (key && indexBySub.has(key)) {
      const idx = indexBySub.get(key)!;
      merged[idx] = { ...merged[idx], ...row };
      updated++;
    } else {
      if (key) indexBySub.set(key, merged.length);
      merged.push(row);
      inserted++;
    }
  }

  return {
    rows: merged,
    inserted,
    updated,
    deduped: cleanedExisting.removed + cleanedIncoming.removed,
  };
}

export function num(v: string | undefined | null): number {
  if (!v) return 0;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function summarisePayments(rows: PaymentRow[]) {
  let settlement = 0;
  let saleAmount = 0;
  let commission = 0;
  let shipping = 0;
  let tds = 0;
  let tcs = 0;
  let compensation = 0;
  let claims = 0;
  let recovery = 0;
  for (const r of rows) {
    settlement += num(r.finalSettlementAmount);
    saleAmount += num(r.totalSaleAmount);
    commission += num(r.meeshoCommission);
    shipping += num(r.shippingCharge) + num(r.returnShippingCharge);
    tds += num(r.tds);
    tcs += num(r.tcs);
    compensation += num(r.compensation);
    claims += num(r.claims);
    recovery += num(r.recovery);
  }
  return {
    count: rows.length,
    settlement,
    saleAmount,
    commission,
    shipping,
    tds,
    tcs,
    compensation,
    claims,
    recovery,
  };
}
