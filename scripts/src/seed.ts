import mongoose from "mongoose";
import { connectDB, OrderModel, InventoryModel, CounterModel } from "@workspace/db";

const PRODUCTS = [
  { sku: "MS-KURTI-001", name: "Cotton Anarkali Kurti — Indigo", platform: "meesho" as const, price: 549 },
  { sku: "MS-KURTI-002", name: "Embroidered A-Line Kurti — Mustard", platform: "meesho" as const, price: 699 },
  { sku: "MS-DUPATTA-101", name: "Banarasi Silk Dupatta", platform: "meesho" as const, price: 399 },
  { sku: "MS-LEHENGA-301", name: "Festive Lehenga Set — Maroon", platform: "meesho" as const, price: 1899 },
  { sku: "MS-SAREE-201", name: "Chiffon Printed Saree — Teal", platform: "meesho" as const, price: 899 },
  { sku: "MS-EARRINGS-401", name: "Oxidised Jhumka Earrings", platform: "meesho" as const, price: 249 },

  { sku: "FK-PHONE-501", name: "Wireless Earbuds Pro 2", platform: "flipkart" as const, price: 1799 },
  { sku: "FK-CHARGER-601", name: "Fast Charger 33W Type-C", platform: "flipkart" as const, price: 599 },
  { sku: "FK-WATCH-701", name: 'Smartwatch Active 1.69"', platform: "flipkart" as const, price: 1499 },
  { sku: "FK-CASE-801", name: "Silicone Phone Case — Midnight", platform: "flipkart" as const, price: 199 },
  { sku: "FK-LAMP-901", name: "LED Desk Lamp Foldable", platform: "flipkart" as const, price: 749 },
  { sku: "FK-SPEAKER-902", name: "Bluetooth Speaker Mini", platform: "flipkart" as const, price: 999 },

  { sku: "AM-BOOK-1001", name: "Atomic Habits — Paperback", platform: "amazon" as const, price: 349 },
  { sku: "AM-BOTTLE-1101", name: "Stainless Steel Bottle 1L", platform: "amazon" as const, price: 449 },
  { sku: "AM-MIXER-1201", name: "Hand Blender 350W", platform: "amazon" as const, price: 1199 },
  { sku: "AM-TOWEL-1301", name: "Bamboo Cotton Towel — Beige", platform: "amazon" as const, price: 299 },
  { sku: "AM-COFFEE-1401", name: "Premium Arabica Coffee 250g", platform: "amazon" as const, price: 549 },
  { sku: "AM-LAMP-1501", name: "Aroma Diffuser Lamp", platform: "amazon" as const, price: 699 },
];

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log("Connecting to MongoDB…");
  await connectDB();

  console.log("Clearing existing orders/inventory…");
  await OrderModel.deleteMany({});
  await InventoryModel.deleteMany({});
  await CounterModel.deleteMany({ _id: { $in: ["orders", "inventory"] } });

  console.log("Seeding inventory…");
  for (const p of PRODUCTS) {
    await InventoryModel.create({
      platform: p.platform,
      sku: p.sku,
      productName: p.name,
      quantity: rand(40, 220),
      price: p.price,
    });
  }

  console.log("Seeding orders…");
  const now = new Date();
  let totalOrders = 0;
  for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
    const ordersToday = rand(3, 9);
    for (let i = 0; i < ordersToday; i++) {
      const product = PRODUCTS[rand(0, PRODUCTS.length - 1)]!;
      const quantity = rand(1, 4);
      const date = new Date(now);
      date.setDate(date.getDate() - dayOffset);
      date.setHours(rand(8, 22), rand(0, 59), 0, 0);
      await OrderModel.create({
        platform: product.platform,
        sku: product.sku,
        productName: product.name,
        quantity,
        price: product.price,
        orderDate: date,
      });
      totalOrders++;
    }
  }

  console.log(`Seeded ${PRODUCTS.length} inventory items and ${totalOrders} orders.`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
