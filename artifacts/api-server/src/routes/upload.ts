import { Router, type IRouter } from "express";
import { OrderModel, InventoryModel } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { requireBrand } from "../middlewares/brand";

const router: IRouter = Router();

const PLATFORMS = ["meesho", "flipkart", "amazon"] as const;
type Platform = (typeof PLATFORMS)[number];

function isPlatform(v: unknown): v is Platform {
  return typeof v === "string" && (PLATFORMS as readonly string[]).includes(v);
}

interface UploadRow {
  platform: Platform;
  productName: string;
  sku: string;
  quantity: number;
  price: number;
  orderDate: string;
  subOrderNo?: string | null;
  orderSource?: string | null;
  reasonForCredit?: string | null;
}

function asOptionalString(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

function isCancelledStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  const s = status.toLowerCase();
  return (
    s.includes("cancel") ||
    s === "rto" ||
    s.startsWith("rto_") ||
    s.startsWith("rto ")
  );
}

router.post("/upload/orders", requireAuth, requireBrand, async (req, res): Promise<void> => {
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
      if (
        !isPlatform(raw["platform"]) ||
        typeof raw["productName"] !== "string" ||
        typeof raw["sku"] !== "string" ||
        !Number.isFinite(Number(raw["quantity"])) ||
        !Number.isFinite(Number(raw["price"])) ||
        typeof raw["orderDate"] !== "string"
      ) {
        throw new Error("Missing or invalid fields");
      }

      const row: UploadRow = {
        platform: raw["platform"],
        productName: raw["productName"],
        sku: raw["sku"],
        quantity: Number(raw["quantity"]),
        price: Number(raw["price"]),
        orderDate: raw["orderDate"],
        subOrderNo: asOptionalString(raw["subOrderNo"]),
        orderSource: asOptionalString(raw["orderSource"]),
        reasonForCredit: asOptionalString(raw["reasonForCredit"]),
      };

      if (isCancelledStatus(row.reasonForCredit)) {
        cancelled++;
        continue;
      }

      let didUpdate = false;
      if (row.subOrderNo) {
        const existingOrder = await OrderModel.findOne({
          brand,
          subOrderNo: row.subOrderNo,
        });
        if (existingOrder) {
          existingOrder.platform = row.platform;
          existingOrder.productName = row.productName;
          existingOrder.sku = row.sku;
          existingOrder.quantity = row.quantity;
          existingOrder.price = row.price;
          existingOrder.orderDate = new Date(row.orderDate);
          existingOrder.orderSource = row.orderSource ?? existingOrder.orderSource;
          existingOrder.reasonForCredit =
            row.reasonForCredit ?? existingOrder.reasonForCredit;
          await existingOrder.save();
          updated++;
          didUpdate = true;
        }
      }

      if (!didUpdate) {
        await OrderModel.create({
          brand,
          platform: row.platform,
          productName: row.productName,
          sku: row.sku,
          quantity: row.quantity,
          price: row.price,
          orderDate: new Date(row.orderDate),
          subOrderNo: row.subOrderNo,
          orderSource: row.orderSource,
          reasonForCredit: row.reasonForCredit,
        });

        const existing = await InventoryModel.findOne({
          brand,
          platform: row.platform,
          sku: row.sku,
        });
        if (existing) {
          existing.quantity = Math.max(0, existing.quantity - row.quantity);
          await existing.save();
        } else {
          await InventoryModel.create({
            brand,
            platform: row.platform,
            productName: row.productName,
            sku: row.sku,
            quantity: 0,
            price: row.price,
          });
        }
        inserted++;
      }
    } catch (err) {
      skipped++;
      const message = err instanceof Error ? err.message : "Unknown error";
      errors.push(`Row ${i + 1}: ${message}`);
      req.log.warn({ err, row: raw }, "Failed to import row");
    }
  }

  res.json({ inserted, updated, skipped, cancelled, errors: errors.slice(0, 20) });
});

export default router;
