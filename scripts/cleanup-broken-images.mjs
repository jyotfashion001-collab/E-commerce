import mongoose from "mongoose";
import { Storage } from "@google-cloud/storage";

const MONGODB_URI = process.env.MONGODB_URI;
const PRIVATE_OBJECT_DIR = process.env.PRIVATE_OBJECT_DIR || "";
const SIDECAR = "http://127.0.0.1:1106";

if (!MONGODB_URI) throw new Error("MONGODB_URI not set");
if (!PRIVATE_OBJECT_DIR) throw new Error("PRIVATE_OBJECT_DIR not set");

function parsePath(path) {
  if (!path.startsWith("/")) path = `/${path}`;
  const parts = path.split("/");
  const bucketName = parts[1];
  const objectName = parts.slice(2).join("/");
  return { bucketName, objectName };
}

const gcs = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${SIDECAR}/token`,
    type: "external_account",
    credential_source: {
      url: `${SIDECAR}/credential`,
      format: { type: "json", subject_token_field_name: "access_token" },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

const { bucketName, objectName: prefix } = parsePath(PRIVATE_OBJECT_DIR + "/inventory/");
const bucket = gcs.bucket(bucketName);

async function listExistingKeys() {
  const [files] = await bucket.getFiles({ prefix: prefix || "inventory/" });
  const keys = new Set();
  for (const f of files) {
    const name = f.name;
    const rel = name.slice(name.indexOf("inventory/"));
    keys.add(rel);
  }
  return keys;
}

function extractObjectKey(url) {
  if (!url) return null;
  const match = url.match(/\/api\/uploads\/object\/(inventory\/[^?#]+)/);
  if (match) return match[1];
  if (url.startsWith("inventory/")) return url;
  return null;
}

await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
console.log("Connected to MongoDB");

const existingKeys = await listExistingKeys();
console.log(`Found ${existingKeys.size} image(s) in cloud storage`);

const Inventory = mongoose.connection.db.collection("inventories");
const Purchase = mongoose.connection.db.collection("purchases");

let inventoryFixed = 0;
let purchaseFixed = 0;

const inventoryItems = await Inventory.find({
  $or: [
    { imageUrl: { $exists: true, $ne: null, $ne: "" } },
    { imageUrls: { $exists: true, $not: { $size: 0 } } },
  ],
}).toArray();

console.log(`Checking ${inventoryItems.length} inventory item(s) with images...`);

for (const item of inventoryItems) {
  const updates = {};

  if (item.imageUrl) {
    const key = extractObjectKey(item.imageUrl);
    if (key && !existingKeys.has(key)) {
      updates.imageUrl = null;
    }
  }

  if (item.imageUrls && item.imageUrls.length > 0) {
    const validUrls = item.imageUrls.filter((url) => {
      const key = extractObjectKey(url);
      return !key || existingKeys.has(key);
    });
    if (validUrls.length !== item.imageUrls.length) {
      updates.imageUrls = validUrls.length > 0 ? validUrls : [];
      if (!updates.imageUrl && validUrls.length === 0 && !updates.hasOwnProperty("imageUrl")) {
        updates.imageUrl = null;
      }
    }
  }

  if (Object.keys(updates).length > 0) {
    await Inventory.updateOne({ _id: item._id }, { $set: updates });
    inventoryFixed++;
    console.log(`  Cleared broken image(s) for inventory item id=${item.id} sku=${item.sku}`);
  }
}

const purchaseItems = await Purchase.find({
  imageUrl: { $exists: true, $ne: null, $ne: "" },
}).toArray();

console.log(`Checking ${purchaseItems.length} purchase(s) with images...`);

for (const item of purchaseItems) {
  const key = extractObjectKey(item.imageUrl);
  if (key && !existingKeys.has(key)) {
    await Purchase.updateOne({ _id: item._id }, { $set: { imageUrl: null } });
    purchaseFixed++;
    console.log(`  Cleared broken image for purchase id=${item._id} sku=${item.sku}`);
  }
}

await mongoose.disconnect();

console.log(`\nDone. Fixed ${inventoryFixed} inventory item(s), ${purchaseFixed} purchase(s).`);
console.log("All broken image references have been cleared from the database.");
