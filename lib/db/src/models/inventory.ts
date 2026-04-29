import mongoose, { type Model } from "mongoose";
import { getNextSequence } from "./counter";
import { type Brand } from "../brand";

export interface InventoryDoc {
  id: number;
  brand: Brand;
  platform: "meesho" | "flipkart" | "amazon";
  productName: string;
  sku: string;
  quantity: number;
  price: number;
  originalPrice?: number;
  gstPercent?: number;
  imageUrl?: string;
  imageUrls?: string[];
  purchaseDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const inventorySchema = new mongoose.Schema<InventoryDoc>(
  {
    id: { type: Number, unique: true, index: true },
    brand: { type: String, required: true, lowercase: true, trim: true, index: true },
    platform: { type: String, enum: ["meesho", "flipkart", "amazon"], required: true },
    productName: { type: String, required: true },
    sku: { type: String, required: true },
    quantity: { type: Number, required: true, default: 0 },
    price: { type: Number, required: true },
    originalPrice: { type: Number },
    gstPercent: { type: Number },
    imageUrl: { type: String },
    imageUrls: { type: [String], default: undefined },
    purchaseDate: { type: Date },
  },
  { timestamps: true, versionKey: false },
);

inventorySchema.index({ brand: 1, platform: 1, sku: 1 }, { unique: true });

inventorySchema.pre("save", async function (next) {
  if (this.isNew && (this.id == null || Number.isNaN(this.id))) {
    this.id = await getNextSequence("inventory");
  }
  next();
});

export const InventoryModel: Model<InventoryDoc> =
  (mongoose.models.Inventory as Model<InventoryDoc>) ||
  mongoose.model<InventoryDoc>("Inventory", inventorySchema);
