import mongoose, { type Model } from "mongoose";
import { getNextSequence } from "./counter";
import { type Brand } from "../brand";

export interface OrderDoc {
  id: number;
  brand: Brand;
  platform: "meesho" | "flipkart" | "amazon";
  productName: string;
  sku: string;
  quantity: number;
  price: number;
  orderDate: Date;
  subOrderNo?: string | null;
  orderSource?: string | null;
  reasonForCredit?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new mongoose.Schema<OrderDoc>(
  {
    id: { type: Number, unique: true, index: true },
    brand: { type: String, required: true, lowercase: true, trim: true, index: true },
    platform: { type: String, enum: ["meesho", "flipkart", "amazon"], required: true, index: true },
    productName: { type: String, required: true },
    sku: { type: String, required: true, index: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    orderDate: { type: Date, required: true, index: true },
    subOrderNo: { type: String, default: null, index: true },
    orderSource: { type: String, default: null },
    reasonForCredit: { type: String, default: null, index: true },
  },
  { timestamps: true, versionKey: false },
);

orderSchema.pre("save", async function (next) {
  if (this.isNew && (this.id == null || Number.isNaN(this.id))) {
    this.id = await getNextSequence("orders");
  }
  next();
});

export const OrderModel: Model<OrderDoc> =
  (mongoose.models.Order as Model<OrderDoc>) ||
  mongoose.model<OrderDoc>("Order", orderSchema);
