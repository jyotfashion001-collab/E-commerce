import type { ImportOrderRow } from "@workspace/api-client-react";

export type Platform = "meesho" | "flipkart" | "amazon";

interface FieldMap {
  productName: string[];
  sku: string[];
  quantity: string[];
  price: string[];
  orderDate: string[];
  subOrderNo?: string[];
  orderSource?: string[];
  reasonForCredit?: string[];
}

const PLATFORM_MAPS: Record<Platform, FieldMap> = {
  meesho: {
    productName: [
      "product name",
      "product",
      "supplier sku",
      "item name",
      "title",
    ],
    sku: ["sku", "supplier sku", "sku id", "variation"],
    quantity: ["quantity", "qty"],
    price: [
      "supplier listed price (incl. gst + commission)",
      "supplier discounted price (incl gst and commision)",
      "supplier discounted price (incl gst and commission)",
      "final settlement amount",
      "transaction price",
      "price",
      "amount",
    ],
    orderDate: [
      "order date",
      "order date as per ist",
      "date",
      "order date as per customer",
    ],
    subOrderNo: ["sub order no", "sub order number", "suborder no"],
    orderSource: ["order source", "source"],
    reasonForCredit: ["reason for credit entry", "reason for credit", "order status", "status"],
  },
  flipkart: {
    productName: [
      "product title",
      "product name",
      "title",
      "item",
      "listing name",
    ],
    sku: ["sku", "sku id", "fsn", "seller sku"],
    quantity: ["quantity", "qty", "ordered qty"],
    price: [
      "order item value",
      "selling price",
      "final selling price",
      "invoice amount",
      "price",
      "amount",
    ],
    orderDate: [
      "order date",
      "order approval date",
      "ordered on",
      "date",
    ],
  },
  amazon: {
    productName: [
      "product-name",
      "product name",
      "title",
      "item-name",
      "asin title",
    ],
    sku: ["sku", "seller-sku", "asin", "merchant-sku"],
    quantity: ["quantity", "quantity-purchased", "qty", "quantity-shipped"],
    price: [
      "item-price",
      "unit-price",
      "selling-price",
      "price",
      "amount",
    ],
    orderDate: [
      "purchase-date",
      "order-date",
      "payments-date",
      "shipment-date",
      "order date",
      "date",
    ],
  },
};

export const PLATFORM_HEADERS: Record<Platform, string[]> = {
  meesho: [
    "Product Name",
    "SKU",
    "Quantity",
    "Supplier Listed Price (Incl. GST + Commission)",
    "Order Date",
  ],
  flipkart: [
    "Product Title",
    "SKU",
    "Quantity",
    "Order Item Value",
    "Order Date",
  ],
  amazon: [
    "product-name",
    "sku",
    "quantity",
    "item-price",
    "purchase-date",
  ],
};

function findValue(row: Record<string, unknown>, candidates: string[]): unknown {
  const keys = Object.keys(row);
  const lower = new Map(keys.map((k) => [k.toLowerCase().trim(), k]));
  for (const c of candidates) {
    const k = lower.get(c.toLowerCase().trim());
    if (k && row[k] !== "" && row[k] !== null && row[k] !== undefined) {
      return row[k];
    }
  }
  return undefined;
}

function parseDate(v: unknown): string {
  if (v == null || v === "") return new Date().toISOString();
  if (typeof v === "number") {
    const date = new Date((v - (25567 + 2)) * 86400 * 1000);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  const s = String(v).trim();
  // Try ISO first
  const direct = new Date(s);
  if (!Number.isNaN(direct.getTime())) return direct.toISOString();
  // Try DD-MM-YYYY or DD/MM/YYYY (common in Indian marketplaces)
  const m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/);
  if (m) {
    const [, d, mo, y] = m;
    const year = y.length === 2 ? Number(y) + 2000 : Number(y);
    const date = new Date(Date.UTC(year, Number(mo) - 1, Number(d)));
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return new Date().toISOString();
}

function parseNumber(v: unknown, fallback = 0): number {
  if (v == null || v === "") return fallback;
  if (typeof v === "number") return Number.isFinite(v) ? v : fallback;
  const cleaned = String(v).replace(/[₹$,\s]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : fallback;
}

export interface MappedRowResult {
  rows: ImportOrderRow[];
  warnings: string[];
}

export function mapPlatformRows(
  platform: Platform,
  rawRows: Array<Record<string, unknown>>,
): MappedRowResult {
  const map = PLATFORM_MAPS[platform];
  const warnings: string[] = [];
  const rows: ImportOrderRow[] = [];

  rawRows.forEach((raw, idx) => {
    const productName = findValue(raw, map.productName);
    const sku = findValue(raw, map.sku);
    const quantity = findValue(raw, map.quantity);
    const price = findValue(raw, map.price);
    const orderDate = findValue(raw, map.orderDate);
    const subOrderNo = map.subOrderNo ? findValue(raw, map.subOrderNo) : undefined;
    const orderSource = map.orderSource ? findValue(raw, map.orderSource) : undefined;
    const reasonForCredit = map.reasonForCredit ? findValue(raw, map.reasonForCredit) : undefined;

    if (!productName && !sku) {
      warnings.push(`Row ${idx + 2}: missing product name and SKU — skipped.`);
      return;
    }

    const row: ImportOrderRow = {
      platform,
      productName: productName ? String(productName).trim() : "Unknown Product",
      sku: sku
        ? String(sku).trim()
        : `${platform.toUpperCase()}-UNKNOWN-${idx + 1}`,
      quantity: Math.max(1, Math.round(parseNumber(quantity, 1))),
      price: parseNumber(price, 0),
      orderDate: parseDate(orderDate),
    };
    if (subOrderNo != null && String(subOrderNo).trim() !== "") {
      row.subOrderNo = String(subOrderNo).trim();
    }
    if (orderSource != null && String(orderSource).trim() !== "") {
      row.orderSource = String(orderSource).trim();
    }
    if (reasonForCredit != null && String(reasonForCredit).trim() !== "") {
      row.reasonForCredit = String(reasonForCredit).trim();
    }
    rows.push(row);
  });

  return { rows, warnings };
}

export function buildSampleTemplate(platform: Platform): Array<Record<string, string | number>> {
  if (platform === "meesho") {
    return [
      {
        "Product Name": "Blue Cotton Saree",
        "SKU": "SAREE-BLU-01",
        "Quantity": 1,
        "Supplier Listed Price (Incl. GST + Commission)": 549,
        "Order Date": "2026-04-20",
      },
      {
        "Product Name": "Yellow Kurti Set",
        "SKU": "KURTI-YEL-M",
        "Quantity": 2,
        "Supplier Listed Price (Incl. GST + Commission)": 799,
        "Order Date": "2026-04-21",
      },
    ];
  }
  if (platform === "flipkart") {
    return [
      {
        "Order Date": "2026-04-20",
        "Product Title": "Men's Black Sneakers",
        "SKU": "SHOE-BLK-9",
        "Quantity": 1,
        "Order Item Value": 1499,
      },
      {
        "Order Date": "2026-04-21",
        "Product Title": "Wireless Earbuds",
        "SKU": "EAR-WHT-01",
        "Quantity": 1,
        "Order Item Value": 1299,
      },
    ];
  }
  return [
    {
      "purchase-date": "2026-04-20",
      "product-name": "Stainless Steel Bottle 1L",
      "sku": "BOT-SS-1L",
      "quantity": 2,
      "item-price": 449,
    },
    {
      "purchase-date": "2026-04-21",
      "product-name": "Cotton Bedsheet King",
      "sku": "BED-KNG-COT",
      "quantity": 1,
      "item-price": 1299,
    },
  ];
}
