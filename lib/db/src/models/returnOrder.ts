import mongoose, { type Model } from "mongoose";
import { getNextSequence } from "./counter";
import { type Brand } from "../brand";

export type ReturnPlatform = "meesho" | "flipkart" | "amazon";

export interface ReturnOrderDoc {
  id: number;
  brand: Brand;
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
  createdAt: Date;
  updatedAt: Date;
}

const returnOrderSchema = new mongoose.Schema<ReturnOrderDoc>(
  {
    id: { type: Number, unique: true, index: true },
    brand: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    platform: {
      type: String,
      enum: ["meesho", "flipkart", "amazon"],
      required: true,
      index: true,
    },
    sku: { type: String, default: "", index: true },
    qty: { type: String, default: "" },
    orderNumber: { type: String, default: "", index: true },
    returnCreatedDate: { type: String, default: "" },
    typeOfReturn: { type: String, default: "", index: true },
    expectedDeliveryDate: { type: String, default: "" },
    courierPartner: { type: String, default: "" },
    status: { type: String, default: "", index: true },
    trackingLink: { type: String, default: "" },
    returnPriceType: { type: String, default: "" },
  },
  { timestamps: true, versionKey: false },
);

returnOrderSchema.index(
  { brand: 1, orderNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { orderNumber: { $type: "string", $ne: "" } },
  },
);

returnOrderSchema.pre("save", async function (next) {
  if (this.isNew && (this.id == null || Number.isNaN(this.id))) {
    this.id = await getNextSequence("returnOrders");
  }
  next();
});

export const ReturnOrderModel: Model<ReturnOrderDoc> =
  (mongoose.models.ReturnOrder as Model<ReturnOrderDoc>) ||
  mongoose.model<ReturnOrderDoc>("ReturnOrder", returnOrderSchema);
