import {
  CompanyModel,
  InventoryModel,
  OrderModel,
  DEFAULT_BRAND,
  DEFAULT_COMPANIES,
} from "@workspace/db";
import { logger } from "./logger";

/**
 * One-time migrations executed on server startup.
 *
 * - Seeds the {@link DEFAULT_COMPANIES} into the `companies` collection on
 *   a fresh database so the workspace boots with the original three brands.
 * - Backfills the `brand` field on existing inventory/order documents that
 *   pre-date multi-brand support, defaulting to {@link DEFAULT_BRAND}.
 * - Drops the legacy `{platform:1, sku:1}` unique index on the inventory
 *   collection so the new `{brand:1, platform:1, sku:1}` index can take over.
 *
 * Each step is idempotent and safe to run on every boot.
 */
export async function runStartupMigrations(): Promise<void> {
  try {
    // 1. Seed default companies if collection is empty.
    const companyCount = await CompanyModel.estimatedDocumentCount();
    if (companyCount === 0) {
      for (const c of DEFAULT_COMPANIES) {
        try {
          await CompanyModel.create({ slug: c.slug, name: c.name });
        } catch (err) {
          logger.warn({ err, slug: c.slug }, "Could not seed default company");
        }
      }
      logger.info(
        { seeded: DEFAULT_COMPANIES.length },
        "Seeded default companies on empty database",
      );
    }

    // 2. Backfill brand on legacy inventory/order docs.
    const invBackfill = await InventoryModel.updateMany(
      { brand: { $exists: false } },
      { $set: { brand: DEFAULT_BRAND } },
    );
    if (invBackfill.modifiedCount > 0) {
      logger.info(
        { modified: invBackfill.modifiedCount, brand: DEFAULT_BRAND },
        "Backfilled brand on legacy inventory documents",
      );
    }

    const orderBackfill = await OrderModel.updateMany(
      { brand: { $exists: false } },
      { $set: { brand: DEFAULT_BRAND } },
    );
    if (orderBackfill.modifiedCount > 0) {
      logger.info(
        { modified: orderBackfill.modifiedCount, brand: DEFAULT_BRAND },
        "Backfilled brand on legacy order documents",
      );
    }

    // 3. Drop legacy unique index that didn't include brand.
    try {
      const indexes = await InventoryModel.collection.indexes();
      const legacy = indexes.find(
        (idx) =>
          idx.name === "platform_1_sku_1" ||
          (idx.key &&
            Object.keys(idx.key).length === 2 &&
            idx.key["platform"] === 1 &&
            idx.key["sku"] === 1),
      );
      if (legacy?.name) {
        await InventoryModel.collection.dropIndex(legacy.name);
        logger.info({ indexName: legacy.name }, "Dropped legacy inventory index");
      }
    } catch (err) {
      logger.warn({ err }, "Could not inspect/drop legacy inventory index");
    }

    // 4. Ensure new indexes are present.
    await InventoryModel.syncIndexes();
    await OrderModel.syncIndexes();
    await CompanyModel.syncIndexes();
  } catch (err) {
    logger.error({ err }, "Startup migrations failed");
  }
}
