export const RETURN_ORDERS_STORAGE_KEY = "orderhub_return_orders";

export type ReturnPlatform = "meesho" | "flipkart" | "amazon";

export interface ReturnRow {
  platform: ReturnPlatform;
  sku: string;
  qty: string;
  orderNumber: string;
  returnCreatedDate: string;
  typeOfReturn: string;
  expectedDeliveryDate: string;
  courierPartner: string;
  status: string;
  trackingLink: string;
  returnPriceType: string;
}

const RETURN_HEADER_ALIASES: Record<keyof Omit<ReturnRow, "platform">, string[]> = {
  sku: ["sku", "supplier sku", "seller sku", "fsn", "asin", "merchant sku", "msku"],
  qty: ["qty", "quantity", "units", "qty.", "return qty", "returned quantity"],
  orderNumber: [
    "order number",
    "order no",
    "order id",
    "order item id",
    "sub order no",
    "sub-order id",
    "sub order id",
    "amazon-order-id",
    "amazon order id",
    "fk order id",
    "order_id",
  ],
  returnCreatedDate: [
    "return created date",
    "return created on",
    "return date",
    "created on",
    "return request date",
    "return-date",
    "request-date",
  ],
  typeOfReturn: [
    "type of return",
    "return type",
    "return category",
    "return sub type",
    "rto/customer return",
    "return-type",
  ],
  expectedDeliveryDate: [
    "expected delivery date",
    "expected return delivery",
    "edd",
    "expected pickup date",
    "estimated delivery date",
  ],
  courierPartner: [
    "courier partner",
    "courier",
    "carrier",
    "carrier-name",
    "shipping provider",
    "logistics partner",
    "courier name",
  ],
  status: [
    "status",
    "return status",
    "live order status",
    "order status",
    "return-status",
  ],
  trackingLink: [
    "tracking link",
    "tracking url",
    "tracking number",
    "tracking-number",
    "awb",
    "awb no",
    "awb number",
  ],
  returnPriceType: [
    "return price type",
    "price type",
    "return reason",
    "return sub-reason",
    "return-reason",
  ],
};

export const RETURN_COLUMN_MAP: Record<string, keyof Omit<ReturnRow, "platform">> =
  (() => {
    const map: Record<string, keyof Omit<ReturnRow, "platform">> = {};
    (Object.keys(RETURN_HEADER_ALIASES) as Array<keyof Omit<ReturnRow, "platform">>)
      .forEach((field) => {
        for (const alias of RETURN_HEADER_ALIASES[field]) {
          map[alias.toLowerCase()] = field;
        }
      });
    return map;
  })();

export function loadReturnRows(): ReturnRow[] {
  try {
    const raw = localStorage.getItem(RETURN_ORDERS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ReturnRow[]) : [];
  } catch {
    return [];
  }
}

export function saveReturnRows(rows: ReturnRow[]) {
  try {
    localStorage.setItem(RETURN_ORDERS_STORAGE_KEY, JSON.stringify(rows));
  } catch {
    /* ignore */
  }
}

export interface ParseResult {
  ok: true;
  rows: ReturnRow[];
}
export interface ParseError {
  ok: false;
  error: string;
}

export async function parseReturnOrdersFile(
  file: File,
  platform: ReturnPlatform = "meesho",
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
    for (let i = 0; i < Math.min(rows.length, 15); i++) {
      const lowered = rows[i].map((c) => String(c).trim().toLowerCase());
      const matches = lowered.filter((h) => h && RETURN_COLUMN_MAP[h]).length;
      if (matches > bestMatches) {
        bestMatches = matches;
        bestSheet = sheetName;
        bestHeaderIdx = i;
        bestRows = rows;
      }
    }
  }

  if (!bestSheet || bestHeaderIdx === -1 || bestMatches < 2) {
    return {
      ok: false,
      error:
        "Could not find recognizable return-order columns. Expected SKU, Order Number / Order ID, Status, etc.",
    };
  }

  const headers = bestRows[bestHeaderIdx].map((h) =>
    String(h).trim().toLowerCase(),
  );
  const dataRows = bestRows.slice(bestHeaderIdx + 1);

  const parsed: ReturnRow[] = dataRows
    .filter((row) =>
      row.some((v) => v !== "" && v !== null && v !== undefined),
    )
    .map((row) => {
      const mapped: Partial<Omit<ReturnRow, "platform">> = {};
      headers.forEach((header, i) => {
        const key = RETURN_COLUMN_MAP[header];
        if (key && !mapped[key]) {
          mapped[key] = String(row[i] ?? "").trim();
        }
      });
      return {
        platform,
        sku: mapped.sku ?? "",
        qty: mapped.qty ?? "",
        orderNumber: mapped.orderNumber ?? "",
        returnCreatedDate: mapped.returnCreatedDate ?? "",
        typeOfReturn: mapped.typeOfReturn ?? "",
        expectedDeliveryDate: mapped.expectedDeliveryDate ?? "",
        courierPartner: mapped.courierPartner ?? "",
        status: mapped.status ?? "",
        trackingLink: mapped.trackingLink ?? "",
        returnPriceType: mapped.returnPriceType ?? "",
      };
    })
    .filter((r) => r.sku || r.orderNumber);

  if (parsed.length === 0) {
    return { ok: false, error: "Found headers but no valid data rows." };
  }

  return { ok: true, rows: parsed };
}

export function isCancelledReturnStatus(status: string | undefined | null): boolean {
  if (!status) return false;
  const s = status.toLowerCase();
  return s.includes("cancel");
}

export interface MergeResult {
  rows: ReturnRow[];
  inserted: number;
  updated: number;
  cancelled: number;
}

export function mergeReturnRows(
  existing: ReturnRow[],
  incoming: ReturnRow[],
): MergeResult {
  let inserted = 0;
  let updated = 0;
  let cancelled = 0;

  const indexByOrder = new Map<string, number>();
  existing.forEach((r, idx) => {
    if (r.orderNumber) indexByOrder.set(r.orderNumber, idx);
  });

  const merged = [...existing];
  for (const row of incoming) {
    if (isCancelledReturnStatus(row.status)) {
      cancelled++;
      continue;
    }
    if (row.orderNumber && indexByOrder.has(row.orderNumber)) {
      const idx = indexByOrder.get(row.orderNumber)!;
      merged[idx] = { ...merged[idx], ...row };
      updated++;
    } else {
      if (row.orderNumber) indexByOrder.set(row.orderNumber, merged.length);
      merged.push(row);
      inserted++;
    }
  }

  return { rows: merged, inserted, updated, cancelled };
}
