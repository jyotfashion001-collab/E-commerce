import mongoose, { type Model } from "mongoose";
import { getNextSequence } from "./counter";

export interface CompanyDoc {
  id: number;
  slug: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;

const companySchema = new mongoose.Schema<CompanyDoc>(
  {
    id: { type: Number, unique: true, index: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (v: string) => SLUG_PATTERN.test(v),
        message:
          "Company slug must be 1-32 chars, lowercase letters/digits/dashes, no leading/trailing dash",
      },
    },
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 80 },
  },
  { timestamps: true, versionKey: false },
);

companySchema.pre("save", async function (next) {
  if (this.isNew && (this.id == null || Number.isNaN(this.id))) {
    this.id = await getNextSequence("companies");
  }
  next();
});

export const CompanyModel: Model<CompanyDoc> =
  (mongoose.models.Company as Model<CompanyDoc>) ||
  mongoose.model<CompanyDoc>("Company", companySchema);

export const COMPANY_SLUG_PATTERN = SLUG_PATTERN;
