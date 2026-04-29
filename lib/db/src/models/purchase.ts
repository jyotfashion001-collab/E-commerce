import mongoose, { type Model } from "mongoose";
import { getNextSequence } from "./counter";
import { type Brand } from "../brand";

export interface CompanyMarketplaceFields {
  amazonSku?: string;
  amazonSellingPrice?: number;
  amazonGstRate?: number;
  flipkartSku?: string;
  flipkartSellingPrice?: number;
  flipkartGstRate?: number;
  meeshoSku?: string;
  meeshoSellingPrice?: number;
  meeshoGstRate?: number;
}

export interface PurchaseDoc {
  id: number;
  brand: Brand;
  productName: string;
  sku: string;
  quantity: number;
  rate: number;
  vendor?: string;
  partyName?: string;
  category?: string;
  purchaseDate: Date;
  notes?: string;
  imageUrl?: string;
  amazonSku?: string;
  amazonSellingPrice?: number;
  amazonGstRate?: number;
  flipkartSku?: string;
  flipkartSellingPrice?: number;
  flipkartGstRate?: number;
  meeshoSku?: string;
  meeshoSellingPrice?: number;
  meeshoGstRate?: number;
  byCompany?: Record<string, CompanyMarketplaceFields>;
  createdAt: Date;
  updatedAt: Date;
}

const purchaseSchema = new mongoose.Schema<PurchaseDoc>(
  {
    id: { type: Number, unique: true, index: true },
    brand: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    productName: { type: String, required: true, trim: true },
    sku: { type: String, required: true, trim: true, index: true },
    quantity: { type: Number, required: true, min: 1 },
    rate: { type: Number, required: true, min: 0 },
    vendor: { type: String, trim: true },
    partyName: { type: String, trim: true },
    category: { type: String, trim: true, index: true },
    purchaseDate: { type: Date, required: true, index: true },
    notes: { type: String, trim: true },
    imageUrl: { type: String, trim: true },
    amazonSku: { type: String, trim: true },
    amazonSellingPrice: { type: Number, min: 0 },
    amazonGstRate: { type: Number, min: 0, max: 100 },
    flipkartSku: { type: String, trim: true },
    flipkartSellingPrice: { type: Number, min: 0 },
    flipkartGstRate: { type: Number, min: 0, max: 100 },
    meeshoSku: { type: String, trim: true },
    meeshoSellingPrice: { type: Number, min: 0 },
    meeshoGstRate: { type: Number, min: 0, max: 100 },
    byCompany: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, versionKey: false, minimize: false },
);

purchaseSchema.index({ brand: 1, purchaseDate: -1 });

purchaseSchema.pre("save", async function (next) {
  if (this.isNew && (this.id == null || Number.isNaN(this.id))) {
    this.id = await getNextSequence("purchase");
  }
  next();
});

export const PurchaseModel: Model<PurchaseDoc> =
  (mongoose.models.Purchase as Model<PurchaseDoc>) ||
  mongoose.model<PurchaseDoc>("Purchase", purchaseSchema);
