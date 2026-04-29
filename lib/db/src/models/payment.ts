import mongoose, { type Model } from "mongoose";
import { getNextSequence } from "./counter";
import { type Brand } from "../brand";

export type PaymentPlatform = "meesho" | "flipkart" | "amazon";

export interface PaymentDoc {
  id: number;
  brand: Brand;
  platform: PaymentPlatform;
  subOrderNo: string;
  orderDate: string;
  dispatchDate: string;
  productName: string;
  sku: string;
  catalogId: string;
  orderSource: string;
  liveOrderStatus: string;
  productGstPct: string;
  listingPrice: string;
  quantity: string;
  transactionId: string;
  paymentDate: string;
  finalSettlementAmount: string;
  priceType: string;
  totalSaleAmount: string;
  totalSaleReturnAmount: string;
  fixedFee: string;
  warehousingFee: string;
  returnPremium: string;
  returnPremiumOfReturn: string;
  meeshoCommissionPct: string;
  meeshoCommission: string;
  meeshoGoldPlatformFee: string;
  meeshoMallPlatformFee: string;
  fixedFee2: string;
  warehousingFee2: string;
  returnShippingCharge: string;
  gstCompensation: string;
  shippingCharge: string;
  otherSupportServiceCharges: string;
  waivers: string;
  netOtherSupportServiceCharges: string;
  gstOnNetOtherSupportServiceCharges: string;
  tcs: string;
  tdsRatePct: string;
  tds: string;
  compensation: string;
  claims: string;
  recovery: string;
  compensationReason: string;
  claimsReason: string;
  recoveryReason: string;
  paymentReview: "" | "pending" | "success";
  finalSettlementAmountNum: number;
  totalSaleAmountNum: number;
  totalSaleReturnAmountNum: number;
  meeshoCommissionNum: number;
  shippingChargeNum: number;
  returnShippingChargeNum: number;
  tdsNum: number;
  tcsNum: number;
  compensationNum: number;
  claimsNum: number;
  recoveryNum: number;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new mongoose.Schema<PaymentDoc>(
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
    subOrderNo: { type: String, default: "", index: true },
    orderDate: { type: String, default: "" },
    dispatchDate: { type: String, default: "" },
    productName: { type: String, default: "", index: true },
    sku: { type: String, default: "", index: true },
    catalogId: { type: String, default: "" },
    orderSource: { type: String, default: "", index: true },
    liveOrderStatus: { type: String, default: "", index: true },
    productGstPct: { type: String, default: "" },
    listingPrice: { type: String, default: "" },
    quantity: { type: String, default: "" },
    transactionId: { type: String, default: "", index: true },
    paymentDate: { type: String, default: "" },
    finalSettlementAmount: { type: String, default: "" },
    priceType: { type: String, default: "" },
    totalSaleAmount: { type: String, default: "" },
    totalSaleReturnAmount: { type: String, default: "" },
    fixedFee: { type: String, default: "" },
    warehousingFee: { type: String, default: "" },
    returnPremium: { type: String, default: "" },
    returnPremiumOfReturn: { type: String, default: "" },
    meeshoCommissionPct: { type: String, default: "" },
    meeshoCommission: { type: String, default: "" },
    meeshoGoldPlatformFee: { type: String, default: "" },
    meeshoMallPlatformFee: { type: String, default: "" },
    fixedFee2: { type: String, default: "" },
    warehousingFee2: { type: String, default: "" },
    returnShippingCharge: { type: String, default: "" },
    gstCompensation: { type: String, default: "" },
    shippingCharge: { type: String, default: "" },
    otherSupportServiceCharges: { type: String, default: "" },
    waivers: { type: String, default: "" },
    netOtherSupportServiceCharges: { type: String, default: "" },
    gstOnNetOtherSupportServiceCharges: { type: String, default: "" },
    tcs: { type: String, default: "" },
    tdsRatePct: { type: String, default: "" },
    tds: { type: String, default: "" },
    compensation: { type: String, default: "" },
    claims: { type: String, default: "" },
    recovery: { type: String, default: "" },
    compensationReason: { type: String, default: "" },
    claimsReason: { type: String, default: "" },
    recoveryReason: { type: String, default: "" },
    paymentReview: {
      type: String,
      enum: ["", "pending", "success"],
      default: "",
      index: true,
    },
    finalSettlementAmountNum: { type: Number, default: 0 },
    totalSaleAmountNum: { type: Number, default: 0 },
    totalSaleReturnAmountNum: { type: Number, default: 0 },
    meeshoCommissionNum: { type: Number, default: 0 },
    shippingChargeNum: { type: Number, default: 0 },
    returnShippingChargeNum: { type: Number, default: 0 },
    tdsNum: { type: Number, default: 0 },
    tcsNum: { type: Number, default: 0 },
    compensationNum: { type: Number, default: 0 },
    claimsNum: { type: Number, default: 0 },
    recoveryNum: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false },
);

paymentSchema.index(
  { brand: 1, subOrderNo: 1 },
  {
    unique: true,
    partialFilterExpression: { subOrderNo: { $type: "string", $ne: "" } },
  },
);

paymentSchema.pre("save", async function (next) {
  if (this.isNew && (this.id == null || Number.isNaN(this.id))) {
    this.id = await getNextSequence("payments");
  }
  next();
});

export const PaymentModel: Model<PaymentDoc> =
  (mongoose.models.Payment as Model<PaymentDoc>) ||
  mongoose.model<PaymentDoc>("Payment", paymentSchema);
